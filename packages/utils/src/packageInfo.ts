import readPkgUp = require('read-pkg-up')
import assert = require('assert')

function getVersion(): string {
  const pkgUp = readPkgUp.sync()
  const version = pkgUp && pkgUp.packageJson && pkgUp.packageJson.version || ''
  assert(version, 'unable to find package.json or .version does not exist')
  return version
}

export { getVersion }
