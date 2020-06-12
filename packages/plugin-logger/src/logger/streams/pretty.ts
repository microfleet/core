/**
 * Pretty printing for Pino logger
 * NOTE: not for production use
 */
import { Writable } from 'stream'
import prettyFactory = require('pino-pretty')
import type { Streams } from 'pino-multi-stream'
import type { Level } from 'pino'

export interface PinoPrettyOptions {
  level: Level
  colorize: boolean
  crlf: boolean
  errorLikeObjectKeys: string[]
  errorProps: string
  levelFirst: boolean
  messageKey: string
  levelKey: string
  messageFormat: boolean
  timestampKey: string
  translateTime: boolean
  search: boolean
  ignore: string
  customPrettifiers: {
    [key: string]: (keyValue: unknown, keyName: string, input: Record<string, unknown>) => string[] | void
  }
}

// options: https://github.com/pinojs/pino-pretty#options
export function prettyStreamFactory(config: PinoPrettyOptions): Streams[0] {
  const { level, ...options } = config

  const pretty = prettyFactory(options)

  const prettyStream = new Writable({
    write(chunk: any, _: any, callback: any) {
      const line = pretty(chunk.toString())
      process.stdout.write(line, callback)
    },
  })

  return {
    level: level || 'debug',
    stream: prettyStream,
  }
}
