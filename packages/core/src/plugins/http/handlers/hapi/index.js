// @flow
import typeof Mservice from '../../../../index';

const Promise = require('bluebird');
const Errors = require('common-errors');
const attachRouter = require('./router/attach');
const _require = require('../../../../utils/require');

export type HapiPlugin = {
  plugin: string | Object,
  options: Object,
  once?: boolean,
};

const defaultPlugins: Array<HapiPlugin> = [{
  plugin: './plugins/redirect',
  options: {},
}, {
  plugin: './plugins/state',
  options: {},
}];

function createHapiServer(config: Object, service: Mservice): PluginInterface {
  const Hapi = _require('hapi');

  const { handlerConfig } = config.server;
  handlerConfig.server.address = config.server.host || '0.0.0.0';
  handlerConfig.server.port = config.server.port || 3000;

  const server = service._http = new Hapi.Server(handlerConfig.server);

  let routerPlugin;
  if (config.router.enabled) {
    routerPlugin = attachRouter(service, config.router);
  }

  // exposes microfleet inside the server for tighter integrations
  server.decorate('server', 'microfleet', service);

  // eslint-disable-next-line no-shadow
  function initPlugins(server) {
    const { list, options } = handlerConfig.plugins;
    const plugins = defaultPlugins.concat(list);

    if (handlerConfig.views) {
      plugins.push({
        plugin: 'vision',
        options: {},
      });

      plugins.push({
        plugin: './plugins/views',
        options: (handlerConfig.views: Object),
      });
    }

    if (routerPlugin !== undefined) {
      plugins.push(routerPlugin);
    }

    const registrations = plugins.map((pluginObj) => {
      // eslint-disable-next-line no-shadow
      const { plugin, options } = pluginObj;

      return {
        // eslint-disable-next-line import/no-dynamic-require
        plugin: typeof plugin === 'string' ? require(plugin) : plugin,
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

      service.socketIO.listen(server.listener, service.config.socketIO.options);
    }

    // $FlowFixMe
    return Promise
      .bind(server, server)
      .tap(initPlugins)
      .tap(server.start)
      .tap(() => {
        if (service._log) {
          service.log.info({ transport: 'http', http: 'hapi' }, 'listening on http://%s:%s', handlerConfig.server.address, handlerConfig.server.port);
        }
      })
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
