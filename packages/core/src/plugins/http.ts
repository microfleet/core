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
  if (is.fn(this.ifError)) {
    // base config
    this.ifError('http', config);

    // server specific config
    if (config.server && config.server.handlerConfig) {
      this.ifError(`http.${config.server.handler}`, config.server.handlerConfig);
    }
  }

  const handler = require(`./http/handlers/${config.server.handler}`);

  return handler(config, this);
}
