const enableDestroy = require('server-destroy');
const Errors = require('common-errors');
const Promise = require('bluebird');
const restify = require('restify');

function createRestifyServer(config, service) {
  const restifyConfig = config.server.handlerConfig || {};
  restifyConfig.socketio = true; // prevent handle socket.io requests, see restify server
  service._http = restify.createServer(restifyConfig);

  function startServer() {
    if (service.http.server.listening === true) {
      return Promise.reject(new Errors.NotPermittedError('Http server was already started'));
    }

    if (config.server.attachSocketIO) {
      if (!service._socketio) {
        return Promise.reject(new Errors.NotPermittedError('SocketIO plugin not found'));
      }

      service.socketio.listen(service.http);
    }

    return new Promise((resolve, reject) => {
      service.http.on('listening', () => {
        service.emit('plugin:start:http', service.http);
        resolve(service.http);
      });
      service.http.on('error', (error) => {
        if (error.errno === 'EADDRINUSE' || error.errno === 'EACCES') {
          reject(error);
        }
      });
      service.http.listen(config.server.port);
    });
  }

  function stopServer() {
    enableDestroy(service.http.server);

    if (config.server.attachSocketIO) {
      if (!service._socketio) {
        return Promise.reject(new Errors.NotPermittedError('SocketIO plugin not found'));
      }

      service.socketio.httpServer = null;
      service.socketio.close();
    }

    return new Promise((resolve, reject) => {
      service.http.server.destroy((error) => {
        if (error) {
          reject(error);
        }

        service.emit('plugin:stop:http');
        resolve();
      });
    });
  }

  return {
    connect: startServer,
    close: stopServer,
  };
}

module.exports = createRestifyServer;
