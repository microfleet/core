import chalk from 'chalk'
import semver = require('semver')

const pluginDependencies = {
  '@microfleet/transport-amqp': '>= 15',
  '@sentry/node': '~4.x.x',
  '@hapi/boom': '~7.x.x || ~8.x.x',
  elasticsearch: '~14.x.x || ~15.x.x',
  'express-cassandra': '~2.x.x',
  '@hapi/hapi': '>= 18.x.x < 19',
  ioredis: '~4.x.x',
  'jaeger-client': '~3.x.x',
  knex: '~0.17.x',
  'ms-socket.io-adapter-amqp': '~6.x.x',
  'opentracing-js-ioredis': '~2.x.x',
  pg: '~7.x.x',
  'server-destroy': '~1.x.x',
  'socket.io': '~2.x.x',
  'socketio-wildcard': '~2.x.x',
  '@hapi/vision': '~5.x.x',
}

interface PluginDep {
  [name: string]: string
}

/**
 * Performs require and validates that constraints are met.
 * @param name - Name of the module to require.
 */
export default (name: string) => {
  const version = (pluginDependencies as PluginDep)[name]
  const depVersion = require(`${name}/package.json`).version

  // print warning if we have incompatible version
  if (!semver.satisfies(depVersion, version)) {
    const msg = `Package ${name} has version ${depVersion} installed. However, required module version is ${version}\n`
    process.stderr.write(chalk.yellow(msg))
  }

  return require(name)
}
