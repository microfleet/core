/**
 * Pretty printing for Pino logger
 * NOTE: not for production use
 */
import { Writable } from 'stream'
const prettyFactory = require('pino-pretty')

// options: https://github.com/pinojs/pino-pretty#options
function prettyStreamFactory(config: any) {
  const { level, ...options } = config

  const pretty = prettyFactory(options)

  const prettyStream = new Writable({
    write(chunk: any, _: any, callback: any) {
      const line = pretty(chunk.toString())
      process.stdout.write(line)
      callback()
    },
  })

  return {
    level: level || 'debug',
    stream: prettyStream,
  }
}

export default prettyStreamFactory
