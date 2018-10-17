import is = require('is');
import { Microfleet, PluginTypes } from '../';

/**
 * Plugin Name
 */
export const name = 'http';

/**
 * Plugin Type
 */
export const type = PluginTypes.transport;

/**
 * Attaches HTTP handler.
 * @param config - HTTP handler configuration to attach.
 */
export function attach(this: Microfleet, config: any) {
  const service = this;

  if (is.fn(service.ifError)) {
    // base config
    service.ifError('http', config);

    // server specific config
    if (config.server && config.server.handlerConfig) {
      service.ifError(`http.${config.server.handler}`, config.server.handlerConfig);
    }
  }

  const handler = require(`./http/handlers/${config.server.handler}`).default;

  return handler(config, this);
}
