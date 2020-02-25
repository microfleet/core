import assert = require('assert')
import { resolve } from 'path'
import { NotFoundError } from 'common-errors'
import pinoms = require('pino-multi-stream')
import SonicBoom = require('sonic-boom')
import every = require('lodash/every')
import { Microfleet, PluginTypes, ValidatorPlugin } from '@microfleet/core'
import { LoggerConfig } from '@microfleet/types/types/plugin-logger'
const prettyStreamFactory = require('./logger/streams/pretty').default

const defaultConfig = {
  debug: false,
  defaultLogger: false,
  // there are no USER env variable in docker image
  // so we can set default value based on its absence
  // NOTE: not intended for production usage
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

  service.validator.addLocation(resolve(__dirname, '../schemas'))
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
    // return either human-readable logger or fast production-ready json logger
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
