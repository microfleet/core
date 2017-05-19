// @flow
const pkg = require('../../package.json');
const semver = require('semver');
const chalk = require('chalk');

/**
 * Performs require and validates that constraints are met
 */

module.exports = function _require(name: string) {
  const version = pkg.pluginDependencies[name];
  // eslint-disable-next-line import/no-dynamic-require
  const depVersion = require(`${name}/package.json`).version;

  // print warning if we have incompatible version
  if (!semver.satisfies(depVersion, version)) {
    // eslint-disable-next-line max-len
    const msg = `Package ${name} has version ${depVersion} installed.`
      + ` However, required module version is ${version}\n`;
    process.stderr.write(chalk.yellow(msg));
  }

  return require(name); // eslint-disable-line import/no-dynamic-require
};
