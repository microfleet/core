import assert from 'node:assert/strict'
// @ts-expect-error TS1479 - works on node 22.12+
import { readPackageUpSync } from 'read-package-up'

function getVersion(): string {
  const pkgUp = readPackageUpSync()
  const version = pkgUp && pkgUp.packageJson && pkgUp.packageJson.version || ''

  assert(version, 'unable to find package.json or .version does not exist')

  return version
}

export { getVersion }
