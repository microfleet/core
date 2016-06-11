const Errors = require('common-errors');
const is = require('is');
const http = require('http');
const https = require('https');
const Promise = require('bluebird');
const enableDestroy = require('server-destroy');

function validateConfig(config, validator) {
  if (is.fn(validator)) {
    const isServerConfigValid = validator('http', config);

    if (isServerConfigValid.error) {
      throw isServerConfigValid.error;
    }

    Object.keys(config.server).forEach((type) => {
      const serverConfig = config.server[type];
      const validatorName = `http.${serverConfig.handler}`;
      const isHandlerConfigValid = validator(validatorName, serverConfig.handlerConfig);

      if (isHandlerConfigValid.error) {
        throw isHandlerConfigValid.error;
      }
    });
  }
}

function createHttpServer(config) {
  const service = this;
  validateConfig(config, service.validateSync);

  Object.keys(config.server).forEach((type) => {
    const serverConfig = config.server[type];
    const handler = require(`./http/handlers/${serverConfig.handler}`)(serverConfig.handlerConfig);
    let server;

    switch (type) {
      case 'http':
        server = http.createServer(handler);
        break;
      case 'https':
        server = https.createServer(serverConfig.options, handler);
        break;
      default:
        throw new Errors.ArgumentError('invalid http plugin config');
    }

    enableDestroy(server);
    service[`_${type}`] = server;
    service[`_${type}Handler`] = handler;
  });

  function startServer() {
    const connectPromises = [];

    Object.keys(config.server).forEach((type) => {
      const serverConfig = config.server[type];
      const server = service[type];

      if (server.listening === true) {
        return Promise.reject(new Errors.NotPermittedError(`${type} server was already started`));
      }

      const connectPromise = new Promise((resolve, reject) => {
        server.on('listening', () => {
          service.emit(`plugin:start:${type}`, server);
          resolve(server);
        });
        server.on('error', (error) => {
          if (error.errno === 'EADDRINUSE' || error.errno === 'EACCES') {
            reject(error);
          }
        });
        server.listen(serverConfig.port);
      });

      return connectPromises.push(connectPromise);
    });

    return Promise.all(connectPromises);
  }

  function stopServer() {
    const disconnectPromises = [];
    Object.keys(config.server).forEach((type) => {
      const server = service[type];

      const disconnectPromise = new Promise((resolve, reject) => {
        server.destroy((error) => {
          if (error) {
            reject(error);
          }

          service.emit(`plugin:stop:${type}`);
          resolve();
        });
      });

      disconnectPromises.push(disconnectPromise);
    });

    return Promise.all(disconnectPromises);
  }

  return {
    connect: startServer,
    close: stopServer,
  };
}

module.exports = {
  name: 'http',
  attach: createHttpServer,
};
