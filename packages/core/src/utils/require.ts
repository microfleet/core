import * as chalk from 'chalk'
import semver = require('semver')

const pluginDependencies = {
  elasticsearch: '~14.x.x || ~15.x.x',
  'express-cassandra': '~2.x.x',
  ioredis: '~4.x.x',
  'jaeger-client': '~3.x.x',
  'opentracing-js-ioredis': '~2.x.x',
  pg: '~7.x.x',
}

interface PluginDep {
  [name: string]: string;
}

/**
 * Performs require and validates that constraints are met.
 * @param name - Name of the module to require.
 */
export default (name: string): any => {
  const version = (pluginDependencies as PluginDep)[name]
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const depVersion = require(`${name}/package.json`).version

  // print warning if we have incompatible version
  if (!semver.satisfies(depVersion, version)) {
    const msg = `Package ${name} has version ${depVersion} installed. However, required module version is ${version}\n`
    process.stderr.write(chalk.yellow(msg))
  }

  return require(name)
}
