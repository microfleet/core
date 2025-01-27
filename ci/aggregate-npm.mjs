/* eslint-disable @typescript-eslint/no-var-requires */
import NPM from '../node_modules/release-it/lib/plugin/npm/npm.js'

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
      return false
    }

    const tag = this.options.tag || (await this.resolveTag(version))
    this.setContext({ version, tag })

    return false
  }
}

export default AggregateNPM
