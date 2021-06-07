import assert = require('assert')
import { resolve } from 'path'
import { PluginTypes } from '@microfleet/utils'
import { NotFoundError } from 'common-errors'
import pino = require('pino')
import pinoms = require('pino-multi-stream')
import { SonicBoom } from 'sonic-boom'
import type { NodeOptions } from '@sentry/node'
import { defaultsDeep } from '@microfleet/utils'
import { Microfleet } from '@microfleet/core-types'
import '@microfleet/plugin-validator'

export { SENTRY_FINGERPRINT_DEFAULT } from './constants'

const defaultConfig: LoggerConfig = {
  /**
   * anything thats not production will include extra logs
   */
  debug: process.env.NODE_ENV !== 'production',

  /**
   * Enables default logger to stdout
   */
  defaultLogger: true,

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
        'query.token',
        'query.jwt',
        '*.awsElasticsearch.node',
        '*.awsElasticsearch.accessKeyId',
        '*.awsElasticsearch.secretAccessKey'
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

export type Logger = pinoms.Logger

export interface LoggerConfig {
  defaultLogger: pino.Logger | boolean;
  prettifyDefaultLogger: boolean;
  debug: boolean;
  name: string;
  options: pinoms.LoggerOptions;
  streams: StreamConfiguration;
}

declare module '@microfleet/core-types' {
  export interface Microfleet {
    log: Logger;
  }

  export interface ConfigurationOptional {
    logger: LoggerConfig;
  }
}

export const levels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'] as const

export const isCompatible = (obj: unknown): obj is pino.Logger => {
  return typeof obj === 'object'
    && obj !== null
    && levels.every((level) => typeof (obj as Record<any, unknown>)[level] === 'function')
}

/**
 * Plugin init function.
 * @param  opts - Logger configuration.
 */
export function attach(this: Microfleet, opts: Partial<LoggerConfig> = {}): void {
  const { version, config: { name: applicationName } } = this

  assert(this.hasPlugin('validator'), new NotFoundError('validator module must be included'))
  this.validator.addLocation(resolve(__dirname, '../schemas'))
  const config = this.validator.ifError<LoggerConfig>('logger', defaultsDeep(opts, defaultConfig))

  const {
    debug,
    defaultLogger,
    prettifyDefaultLogger,
    options,
    name: serviceName,
    streams: streamsConfig,
  } = config

  if (isCompatible(defaultLogger)) {
    this.log = defaultLogger
    return
  }

  if (streamsConfig.sentry && !streamsConfig.sentry.release) {
    streamsConfig.sentry.release = version
  }

  const streams: pinoms.Streams = []

  if (defaultLogger === true) {
    // return either human-readable logger or fast production-ready json logger
    const getDefaultStream = (): NodeJS.WritableStream | pino.DestinationStream => {
      if (prettifyDefaultLogger) {
        const { stream } = streamsFactory('pretty', { translateTime: true })
        return stream
      }

      // @ts-expect-error - outtdated types
      return new SonicBoom({ fd: process.stdout.fd || 1 })
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

  if (process.env.NODE_ENV === 'test') {
    this.log.debug({ config: this.config }, 'loaded configuration')
  }
}
