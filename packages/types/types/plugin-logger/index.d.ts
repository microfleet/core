import pino = require('pino')
import pinoms = require('pino-multi-stream')

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
