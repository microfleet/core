import { readPackageUpSync } from 'read-pkg-up'
import { strict as assert } from 'assert'

function getVersion(): string {
  const pkgUp = readPackageUpSync()
  const version = pkgUp && pkgUp.packageJson && pkgUp.packageJson.version || ''

  assert(version, 'unable to find package.json or .version does not exist')

  return version
}

export { getVersion }
