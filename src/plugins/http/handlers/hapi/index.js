const Errors = require('common-errors');
const attachRouter = require('./router/attach');
const Promise = require('bluebird');
const _require = require('../../../../utils/require');

const defaultPlugins = [{
  register: './plugins/redirect',
  options: {},
}];

function createHapiServer(config, service) {
  const Hapi = _require('hapi');

  const handlerConfig = config.server.handlerConfig;
  const server = service._http = new Hapi.Server(handlerConfig.server);

  server.connection(Object.assign({}, handlerConfig.connection, {
    port: config.server.port,
    address: config.server.host,
  }));

  if (config.router.enabled) {
    attachRouter(service, server, config.router);
  }

  // eslint-disable-next-line no-shadow
  function initPlugins(server) {
    const { list, options } = handlerConfig.plugins;
    const plugins = defaultPlugins.concat(list);

    if (handlerConfig.views) {
      plugins.push({
        register: 'vision',
        options: {},
      }, {
        register: './plugins/views',
        options: handlerConfig.views,
      });
    }

    const registrations = plugins.map((plugin) => {
      // eslint-disable-next-line no-shadow
      const { register, options } = plugin;

      return {
        // eslint-disable-next-line import/no-dynamic-require
        register: typeof register === 'string' ? require(register) : register,
        options,
      };
    });

    return server.register(registrations, options);
  }

  function startServer() {
    if (config.server.attachSocketIO) {
      if (!service._socketIO) {
        return Promise.reject(new Errors.NotPermittedError('SocketIO plugin not found'));
      }

      service.socketIO.listen(server.listener);
    }

    return Promise.resolve(server)
      .tap(initPlugins)
      .tap(() => server.start())
      .return(server)
      .tap(() => service.emit('plugin:start:http', server));
  }

  function stopServer() {
    return Promise.resolve(server.stop())
      .tap(() => service.emit('plugin:stop:http', server));
  }

  return {
    connect: startServer,
    close: stopServer,
  };
}

module.exports = createHapiServer;
