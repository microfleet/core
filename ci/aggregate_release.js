/* eslint-disable @typescript-eslint/no-var-requires */
const { Plugin } = require('release-it')
const fs = require('fs/promises')
const { resolve } = require('path')

const staged = resolve(__dirname, './staged')

module.exports = class AggregateRelease extends Plugin {
  async init() {
    this.name = this.config.getContext('name')
    this.staged = resolve(staged, `${this.name.replace(/\//g, '__')}.json`)

    const { isDryRun } = this.config
    if (!isDryRun) {
      await fs.unlink(this.staged).catch(() => {/* noop */})
    }
  }

  async bump(version) {
    const { name, latestVersion, changelog } = this.config.getContext()

    if (version === latestVersion) {
      this.log.info('skipping %s release', name)
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
      await fs.writeFile(this.staged, release)
    }
  }
}
