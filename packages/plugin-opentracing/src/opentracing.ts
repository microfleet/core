import assert = require('assert')
import { NotFoundError } from 'common-errors'
import type { Microfleet } from '@microfleet/core-types'
import { PluginTypes } from '@microfleet/utils'
import { initTracer, JaegerTracer, TracingConfig, TracingOptions } from 'jaeger-client'
import { resolve } from 'path'

/* eslint-disable @typescript-eslint/no-unused-vars */
import type * as _ from '@microfleet/plugin-logger'
import type * as __ from '@microfleet/plugin-validator'
/* eslint-enable @typescript-eslint/no-unused-vars */

export interface Config {
  config?: TracingConfig
  options?: TracingOptions
}

declare module '@microfleet/core-types' {
  interface Microfleet {
    tracer: JaegerTracer
  }

  interface ConfigurationOptional {
    opentracing: Config
  }
}

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
export function attach(this: Microfleet, opts = {}): void {
  assert(this.hasPlugin('logger'), new NotFoundError('logger module must be included'))
  assert(this.hasPlugin('validator'), new NotFoundError('validator module must be included'))

  // load local schemas
  this.validator.addLocation(resolve(__dirname, '../schemas'))

  const settings = this.validator.ifError<Config>('opentracing', opts)
  const { config = {}, options = {} } = settings

  // init tracer
  this.tracer = initTracer(config, {
    ...options,
    logger: this.log,
  })
}