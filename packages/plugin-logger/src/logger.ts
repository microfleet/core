import assert = require('assert')
import { resolve } from 'path'
import { PluginTypes } from '@microfleet/utils'
import { NotFoundError } from 'common-errors'
import { pino } from 'pino'
import type { NodeOptions } from '@sentry/node'
import { defaultsDeep } from '@microfleet/utils'
import { Microfleet } from '@microfleet/core-types'

import '@microfleet/plugin-validator'
import { sentryToPinoLogLevel } from './logger/streams/sentry'

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
    level: process.env.NODE_ENV !== 'production' ? 'debug' : 'info',
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

function streamsFactory(streamName: string, options: any): pino.TransportTargetOptions {
  if (streamName === 'sentry') {
    return {
      level: sentryToPinoLogLevel(options),
      target: resolve(__dirname, '../lib/logger/streams/sentry'),
      options,
    }
  }

  if (streamName === 'pretty') {
    return {
      level: options.level || 'debug',
      target: 'pino-pretty',
      options,
    }
  }

  return options
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

export type Logger = pino.Logger

export interface LoggerConfig {
  defaultLogger: pino.Logger | boolean | pino.TransportBaseOptions;
  prettifyDefaultLogger: boolean;
  debug: boolean;
  name: string;
  options: pino.LoggerOptions;
  streams: StreamConfiguration;
  worker?: pino.TransportBaseOptions['worker'];
}

declare module '@microfleet/core-types' {
  export interface Microfleet {
    log: Logger;
    logTransport?: pino.ThreadStream;
    logClose?: () => void;
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
    worker,
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

  const targets: pino.TransportTargetOptions[]  = []
  const pinoOptions: pino.LoggerOptions = {
    ...options,
    name: applicationName || serviceName,
  }

  if (defaultLogger) {
    const extra = typeof defaultLogger === 'boolean' ? {} : defaultLogger
    const level: pino.Level = debug ? 'debug' : 'info'
    targets.push({
      level,
      target: prettifyDefaultLogger
        ? 'pino-pretty'
        : 'pino/file',
      options: prettifyDefaultLogger
        ? { translateTime: true, ...extra.options }
        : { destination: process.stdout.fd, ...extra.options },
    })
  }

  for (const [streamName, streamConfig] of Object.entries(streamsConfig)) {
    targets.push(streamsFactory(streamName, streamConfig))
  }

  if (targets.length > 0) {
    assert(!pinoOptions.transport, 'transport must be undefined when using default streams')
    pinoOptions.transport = { targets, worker }
  }

  this.log = pino(pinoOptions)

  if (config.worker?.autoEnd === false) {
    // @ts-expect-error not-exposed, but present
    const transport = this.log[pino.symbols.streamSym]
    assert(transport, 'couldnt get auto-assigned transport')
    this.logClose = () => {
      transport.ref()
      transport.flushSync()
      transport.end()
      transport.once('close', () => {
        transport.unref()
      })
    }
  }

  if (process.env.NODE_ENV === 'test') {
    this.log.debug({ config }, 'loaded logger configuration')
  }
}
