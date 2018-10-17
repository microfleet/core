import is = require('is')
import { Microfleet, PluginTypes } from '../'
import _require from '../utils/require'

/**
 * Plugin Name
 */
export const name = 'opentracing'

/**
 * Plugin Type
 */
export const type = PluginTypes.essential

/**
 * Attaches plugin to the MService class.
 * @param settings - AMQP plugin configuration.
 */
export function attach(this: Microfleet, settings: any = {}) {
  const service = this
  const { initTracer } = _require('jaeger-client')

  // optional validation with the plugin
  if (is.fn(service.ifError)) {
    service.ifError('opentracing', settings)
  }

  // push logger over
  if (is.fn(service.log)) {
    settings.options.logger = service.log
  }

  // init tracer
  service.tracer = initTracer(settings.config, settings.options)
}
