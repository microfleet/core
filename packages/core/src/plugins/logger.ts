import assert = require('assert')
import { Microfleet } from '../'
import { PluginTypes } from '../constants'
import { ValidatorPlugin } from './validator'
import { NotFoundError } from 'common-errors'
import bunyan = require('bunyan')
import stdout = require('stdout-stream')

const defaultConfig = {
  debug: false,
  defaultLogger: false,
  name: 'mservice',
  streams: {},
  trace: false,
}

function streamsFactory(streamName: string, options: any) {
  switch (streamName) {
    case 'sentry': {
      const sentryStreamFactory = require('./logger/streams/sentry').default
      return sentryStreamFactory(options)
    }

    default:
      return options
  }
}

/**
 * Plugin Type
 */
export const type = PluginTypes.essential

/**
 * Relative priority inside the same plugin group type
 */
export const priority = 10

/**
 * Plugin Name
 */
export const name = 'logger'

/**
 * Logger Plugin interface.
 */
export interface LoggerPlugin {
  log: bunyan
}

export interface LoggerConfig {
  defaultLogger: any
  debug: boolean
  name: string
  trace?: boolean
  streams: {
    [streamName: string]: any
  }
}

/**
 * Plugin init function.
 * @param  config - Logger configuration.
 */
export function attach(this: Microfleet & ValidatorPlugin, opts: Partial<LoggerConfig>) {
  const service = this
  const { config: { name: applicationName } } = service

  assert(service.hasPlugin('validator'), new NotFoundError('validator module must be included'))
  const config = service.ifError('logger', opts) as LoggerConfig

  const {
    debug,
    defaultLogger,
    name: serviceName,
    streams: streamsConfig,
    trace,
  } = Object.assign({}, defaultConfig, config)

  if (defaultLogger instanceof bunyan) {
    service.log = defaultLogger
    return
  }

  const streams: bunyan.Stream[] = []

  if (trace) {
    streams.push({
      level: 'trace',
      stream: new bunyan.RingBuffer({ limit: 100 }),
      type: 'raw',
    })
  }

  if (defaultLogger === true) {
    streams.push({
      level: debug ? 'debug' : 'info',
      stream: stdout,
    })
  }

  for (const [streamName, streamConfig] of Object.entries(streamsConfig)) {
    streams.push(streamsFactory(streamName, streamConfig))
  }

  service.log = bunyan.createLogger({
    streams,
    name: applicationName || serviceName,
  })
}
