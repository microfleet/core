import { strict as assert } from 'node:assert'
import { resolve } from 'path'
import { PluginTypes } from '@microfleet/utils'
import { NotFoundError } from 'common-errors'
import { pino } from 'pino'
import { PrettyOptions } from 'pino-pretty'
import type { NodeOptions as SentryNodeOptions } from '@sentry/node'
import { defaultsDeep } from '@microfleet/utils'
import { Microfleet, PluginInterface } from '@microfleet/core-types'
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
      level: options.level || 'info',
      target: resolve(__dirname, '../lib/logger/streams/sentry-worker'),
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
  sentry?: {
    minLevel?: number,
    level?: pino.Level,
    externalConfiguration?: string,
    sentry: SentryNodeOptions,
  };
  pretty?: PrettyOptions;
  [streamName: string]: any;
}

export type Logger = pino.Logger
// @TODO use pino.ThreadStream type in future https://github.com/pinojs/pino/blob/v7.6.3/pino.d.ts#L31
export type ThreadStream = any

export interface LoggerConfig {
  defaultLogger: Logger | boolean | pino.TransportBaseOptions;
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
    logTransport?: any; // type ThreadStream = any https://github.com/pinojs/pino/blob/v7.6.3/pino.d.ts#L31
    logClose?: () => Promise<void>;
  }

  export interface ConfigurationOptional {
    logger: LoggerConfig;
  }
}

export const levels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'] as const

export const isCompatible = (obj: unknown): obj is Logger => {
  return typeof obj === 'object'
    && obj !== null
    && levels.every((level) => typeof (obj as Record<any, unknown>)[level] === 'function')
}

const noopInterface: PluginInterface = {
   async close() {
     return
   }
}

/**
 * Plugin init function.
 * @param  opts - Logger configuration.
 */
export function attach(this: Microfleet, opts: Partial<LoggerConfig> = {}): PluginInterface {
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
    return noopInterface
  }

  if (streamsConfig.sentry && !streamsConfig.sentry.sentry.release) {
    streamsConfig.sentry.sentry.release = version
  }

  const targets: pino.TransportTargetOptions[]  = []
  const pinoOptions: pino.LoggerOptions = {
    ...options,
    name: applicationName || serviceName,
  }

  if (defaultLogger) {
    const extra = typeof defaultLogger === 'boolean' ? {} : defaultLogger
    const level: pino.LevelWithSilentOrString = options.level || (debug ? 'debug' : 'info')
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
  this.logClose = () => new Promise((resolve, reject) => {
    this.log.flush((err) => err ? reject(err) : resolve())
  })

  if (process.env.NODE_ENV === 'test') {
    this.log.debug({ config }, 'loaded logger configuration')
  }

  return {
    async close(this: Microfleet): Promise<void> {
      this.log.flush()
    }
  }
}
