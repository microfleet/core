import assert = require('assert')
import { Microfleet, PluginTypes, ValidatorPlugin } from '@microfleet/core'
import { NotFoundError } from 'common-errors'
import pino = require('pino')
import pinoms = require('pino-multi-stream')
import SonicBoom = require('sonic-boom')
import every = require('lodash/every')
import type { NodeOptions } from '@sentry/node'
import { resolve } from 'path'

export { SENTRY_FINGERPRINT_DEFAULT } from './constants'

const defaultConfig = {
  debug: false,
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
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { sentryStreamFactory } = require('./logger/streams/sentry')
      return sentryStreamFactory(options)
    }

    case 'pretty': {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { prettyStreamFactory } = require('./logger/streams/pretty')
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
  log: Logger;
}

export type Logger = pinoms.Logger

export interface StreamConfiguration {
  sentry?: NodeOptions;
  pretty?: {
    colorize?: boolean;
    crlf?: boolean;
    errorLikeObjectKeys?: string[];
    errorProps?: string;
    levelFirst?: boolean;
    messageKey?: string;
    messageFormat?: boolean;
    timestampKey?: string;
    translateTime?: boolean;
    useMetadata?: boolean;
    outputStream?: NodeJS.WritableStream;
    customPrettifiers?: any;
  };
  [streamName: string]: any;
}

export interface LoggerConfig {
  defaultLogger: any;
  prettifyDefaultLogger: boolean;
  debug: boolean;
  name: string;
  options: pino.LoggerOptions;
  streams: StreamConfiguration;
}

export const levels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal']

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const isCompatible = (obj: any): obj is pino.Logger => {
  return typeof obj === 'object'
    && obj !== null
    && every(exports.levels, (level: any) => typeof obj[level] === 'function')
}

/**
 * Plugin init function.
 * @param  opts - Logger configuration.
 */
export function attach(this: Microfleet & ValidatorPlugin, opts: Partial<LoggerConfig>): void {
  assert(this.hasPlugin('validator'), new NotFoundError('validator module must be included'))

  this.validator.addLocation(resolve(__dirname, '../schemas'))

  const { config: { name: applicationName } } = this
  const config = this.validator.ifError<LoggerConfig>('logger', opts)
  const {
    debug,
    defaultLogger,
    prettifyDefaultLogger,
    options,
    name: serviceName,
    streams: streamsConfig,
  } = Object.assign({}, defaultConfig, config)

  if (isCompatible(defaultLogger)) {
    this.log = defaultLogger
    return
  }

  const streams: pinoms.Streams = []

  if (defaultLogger === true) {
    // return either human-readable logger or fast production-ready json logger
    const getDefaultStream = (): NodeJS.WritableStream | pino.DestinationStream => {
      if (prettifyDefaultLogger) {
        const { stream } = streamsFactory('pretty', { translateTime: true })
        return stream
      }

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      return new SonicBoom({ fd: process.stdout.fd })
    }

    streams.push({
      level: debug ? 'debug' : 'info',
      stream: getDefaultStream(),
    })
  }

  for (const [streamName, streamConfig] of Object.entries(streamsConfig)) {
    streams.push(streamsFactory(streamName, streamConfig))
  }

  this.log = pinoms({
    ...options,
    streams,
    name: applicationName || serviceName,
  })
}

declare module '@microfleet/core' {
  export interface Microfleet {
    log: pinoms.Logger;
  }

  export interface ConfigurationOptional {
    logger: LoggerConfig;
  }
}
