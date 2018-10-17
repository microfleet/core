import assert = require('assert');
import Bluebird = require('bluebird');
import { NotPermittedError } from 'common-errors';
import { Plugin, Server } from 'hapi';
import { Microfleet } from '../../../..';
import { IPluginInterface } from '../../../../types';
import _require from '../../../../utils/require';
import attachRouter from './router/attach';

export interface IHapiPlugin {
  plugin: string | Plugin<any>;
  options?: any;
  once?: boolean;
}

const defaultPlugins: IHapiPlugin[] = [{
  options: {},
  plugin: './plugins/redirect',
}, {
  options: {},
  plugin: './plugins/state',
}];

function createHapiServer(config: any, service: Microfleet): IPluginInterface {
  const { handlerConfig } = config.server;
  handlerConfig.server.address = config.server.host || '0.0.0.0';
  handlerConfig.server.port = config.server.port || 3000;

  assert(service.hasPlugin('logger'), 'must include logger plugin');

  const server = service.http = new Server(handlerConfig.server);

  let routerPlugin: IHapiPlugin;
  if (config.router.enabled) {
    routerPlugin = attachRouter(service, config.router);
  }

  // exposes microfleet inside the server for tighter integrations
  server.decorate('server', 'microfleet', service as any);

  async function initPlugins() {
    const { list, options } = handlerConfig.plugins;
    const plugins = defaultPlugins.concat(list);

    if (handlerConfig.views) {
      plugins.push({
        options: {},
        plugin: 'vision',
      });

      plugins.push({
        options: handlerConfig.views,
        plugin: './plugins/views',
      });
    }

    if (routerPlugin !== undefined) {
      plugins.push(routerPlugin);
    }

    const registrations = [];
    for (const pluguinConfiguration of plugins) {
      registrations.push({
        options: pluguinConfiguration.options,
        plugin: typeof pluguinConfiguration.plugin === 'string'
          ? require(pluguinConfiguration.plugin)
          : pluguinConfiguration.plugin,
      });
    }

    return server.register(registrations, options);
  }

  async function startServer() {
    if (config.server.attachSocketIO) {
      if (!service.socketIO) {
        return Bluebird.reject(new NotPermittedError('SocketIO plugin not found'));
      }

      service.socketIO.listen(server.listener, service.config.socketIO.options);
    }

    await initPlugins();
    await server.start();

    service.log.info(
      { transport: 'http', http: 'hapi' },
      'listening on http://%s:%s',
      handlerConfig.server.address,
      handlerConfig.server.port,
    );

    service.emit('plugin:start:http', server);

    return server;
  }

  async function stopServer() {
    await server.stop();
    service.emit('plugin:stop:http', server);
  }

  return {
    close: stopServer,
    connect: startServer,
  };
}

export default createHapiServer;
