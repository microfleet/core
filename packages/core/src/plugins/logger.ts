import assert = require('assert')
import { Microfleet } from '../'
import { PluginTypes } from '../constants'
import { ValidatorPlugin } from './validator'
import { NotFoundError } from 'common-errors'
import pino = require('pino')
import pinoms = require('pino-multi-stream')
import SonicBoom = require('sonic-boom')
import every = require('lodash/every')
const prettyStreamFactory = require('./logger/streams/pretty').default

const defaultConfig = {
  debug: false,
  defaultLogger: false,
  // there are no USER env variable in docker image
  // so we can set default value based on its absence
  // NOTE: not indended for production use
  prettifyDefaultLogger: !(process.env.NODE_ENV === 'production' || !process.env.USER),
  name: 'mservice',
  streams: {},
  options: {
    redact: {
      paths: [
        'headers.cookie',
        'headers.authentication',
        'params.password',
      ],
    },
  },
}

function streamsFactory(streamName: string, options: any): pinoms.Streams[0] {
  switch (streamName) {
    case 'sentry': {
      const sentryStreamFactory = require('./logger/streams/sentry').default
      return sentryStreamFactory(options)
    }

    case 'pretty': {
      return prettyStreamFactory(options)
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
  log: pinoms.Logger
}

export interface LoggerConfig {
  defaultLogger: any
  prettifyDefaultLogger: boolean
  debug: boolean
  name: string
  options: pino.LoggerOptions
  streams: {
    [streamName: string]: pinoms.Streams
  }
}

export const levels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal']
export const isCompatible = (obj: any) => {
  return obj !== null
    && typeof obj === 'object'
    && every(exports.levels, (level: any) => typeof obj[level] === 'function')
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
    prettifyDefaultLogger,
    options,
    name: serviceName,
    streams: streamsConfig,
  } = Object.assign({}, defaultConfig, config)

  if (isCompatible(defaultLogger)) {
    service.log = defaultLogger
    return
  }

  const streams: pinoms.Streams = []

  if (defaultLogger === true) {
    // return either human-readable logger or fast production-readt json logger
    const getDefaultStream = () => {
      if (prettifyDefaultLogger) {
        const { stream } = prettyStreamFactory({
          translateTime: true,
        })
        return stream
      }
      return new SonicBoom((process.stdout as any).fd) as any
    }

    streams.push({
      level: debug ? 'debug' : 'info',
      stream: getDefaultStream(),
    })
  }

  for (const [streamName, streamConfig] of Object.entries(streamsConfig)) {
    streams.push(streamsFactory(streamName, streamConfig))
  }

  service.log = pinoms({
    ...options,
    streams,
    name: applicationName || serviceName,
  })
}
