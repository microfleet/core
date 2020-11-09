import assert = require('assert')
import { NotFoundError } from 'common-errors'
import type { Microfleet } from '@microfleet/core-types'
import { PluginTypes } from '@microfleet/utils'
import { initTracer } from 'jaeger-client'

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
 * @param opts - AMQP plugin configuration.
 */
export function attach(this: Microfleet, opts: any = {}): void {
  assert(this.hasPlugin('logger'), new NotFoundError('log module must be included'))
  const settings = this.validator.ifError('opentracing', opts)

  // init tracer
  this.tracer = initTracer(settings.config, {
    ...settings.options,
    logger: this.log,
  })
}
