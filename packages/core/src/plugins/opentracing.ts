import assert = require('assert')
import { NotFoundError } from 'common-errors'
import { Microfleet, PluginTypes, ValidatorPlugin } from '../'
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
 * Relative priority inside the same plugin group type
 */
export const priority = 50

/**
 * Attaches plugin to the MService class.
 * @param settings - AMQP plugin configuration.
 */
export function attach(this: Microfleet & ValidatorPlugin, opts: any = {}) {
  const service = this
  const { initTracer } = _require('jaeger-client')

  assert(service.hasPlugin('logger'), new NotFoundError('log module must be included'))
  const settings = service.validator.ifError('opentracing', opts)

  // init tracer
  service.tracer = initTracer(settings.config, {
    ...settings.options,
    logger: service.log,
  })
}
