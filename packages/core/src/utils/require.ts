import chalk from 'chalk';
import semver = require('semver');
import pkg = require('../../package.json');

interface IPluginDep {
  [name: string]: string;
}

/**
 * Performs require and validates that constraints are met.
 * @param name - Name of the module to require.
 */
export default function _require(name: string) {
  const version = (pkg.pluginDependencies as IPluginDep)[name];
  const depVersion = require(`${name}/package.json`).version;

  // print warning if we have incompatible version
  if (!semver.satisfies(depVersion, version)) {
    // eslint-disable-next-line max-len
    const msg = `Package ${name} has version ${depVersion} installed.`
      + ` However, required module version is ${version}\n`;
    process.stderr.write(chalk.yellow(msg));
  }

  return require(name);
}
