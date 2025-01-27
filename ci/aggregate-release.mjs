import { Plugin } from 'release-it'
import fs from 'node:fs/promises'
import { resolve } from 'node:path'

const staged = resolve(import.meta.dirname, './staged')

export default class AggregateRelease extends Plugin {
  getIncrementedVersion() {
    // if we are at this stage then previous plugin
    // did not return version and we are at the same version as before
    return this.config.getContext('latestVersion')
  }

  getIncrementedVersionCI(options) {
    return this.getIncrementedVersion(options)
  }

  async beforeBump() {
    const { name } = this.config.getContext()
    const kFilename = resolve(staged, `${name.replace(/\//g, '__')}.json`)

    this.setContext({ staged: kFilename })
    const { isDryRun } = this.config
    if (!isDryRun) {
      await fs.unlink(kFilename).catch(() => {/* noop */})
    }
  }

  async bump(version) {
    const { name, latestVersion, changelog } = this.config.getContext()
    this.debug({ name, latestVersion, version })

    if (version === latestVersion || !version) {
      this.debug(`skipping ${name} release`)
      return
    }

    const release = JSON.stringify({
      name,
      latestVersion,
      version,
      changelog
    })

    const { isDryRun } = this.config
    if (!isDryRun) {
      await fs.writeFile(this.getContext('staged'), release)
    }
  }
}
