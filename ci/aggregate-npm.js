/* eslint-disable @typescript-eslint/no-var-requires */
const NPM = require('release-it/lib/plugin/npm/npm')

class AggregateNPM extends NPM {
  static disablePlugin() {
    return ['npm']
  }

  getInitialOptions(options, namespace) {
    options[namespace] = options.npm
    return options[namespace]
  }

  async bump(version) {
    if (version === this.getContext('latestVersion') || !version) {
      this.debug('skipping npm version')
      return
    }

    return super.bump(version)
  }
}

module.exports = AggregateNPM
