/* eslint-disable @typescript-eslint/no-var-requires */
const ConventionalChangelog = require('@release-it/conventional-changelog')

class AggregateConventionalChangelog extends ConventionalChangelog {
  async beforeRelease() {
    const { version, latestVersion } = this.config.getContext()
    if (version === latestVersion) {
      this.debug('skipping writing changelog')
      return
    }

    return super.beforeRelease()
  }
}

module.exports = AggregateConventionalChangelog
