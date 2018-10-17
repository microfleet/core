import chalk from 'chalk'
import semver = require('semver')

const pluginDependencies = {
  '@microfleet/transport-amqp': '>= 13',
  'body-parser': '~1.x.x',
  boom: '~7.x.x',
  bunyan: '~1.x.x',
  'bunyan-sentry-stream': '~1.x.x',
  elasticsearch: '~14.x.x || ~15.x.x',
  'express-cassandra': '~1.x.x',
  hapi: '>= 17.x.x < 18',
  ioredis: '~3.x.x || ~4.x.x',
  'jaeger-client': '~3.x.x',
  knex: '~0.14.x',
  'ms-socket.io-adapter-amqp': '~5.x.x',
  'opentracing-js-ioredis': '~1.x.x || ~2.x.x',
  pg: '~7.x.x',
  raven: '~2.x.x',
  'server-destroy': '~1.x.x',
  'socket.io': '~2.x.x',
  'socketio-wildcard': '~2.x.x',
  vision: '~5.x.x',
}

interface PluginDep {
  [name: string]: string
}

/**
 * Performs require and validates that constraints are met.
 * @param name - Name of the module to require.
 */
export default function _require(name: string) {
  const version = (pluginDependencies as PluginDep)[name]
  const depVersion = require(`${name}/package.json`).version

  // print warning if we have incompatible version
  if (!semver.satisfies(depVersion, version)) {
    // eslint-disable-next-line max-len
    const msg = `Package ${name} has version ${depVersion} installed.`
      + ` However, required module version is ${version}\n`
    process.stderr.write(chalk.yellow(msg))
  }

  return require(name)
}
