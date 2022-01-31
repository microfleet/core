/* eslint-disable @typescript-eslint/no-var-requires */
const Git = require('release-it/lib/plugin/git/Git')
const { format } = require('release-it/lib/util')
const { resolve, basename } = require('path')
const yaml = require('js-yaml')
const fs = require('fs/promises')
const { promisify } = require('util')
const glob = promisify(require('glob'))
const { EOL } = require('os')
const prependFile = require('prepend-file')

const fixArgs = args => (args ? (typeof args === 'string' ? args.split(' ') : args) : [])
const staged = resolve(__dirname, './staged')
const root = resolve(__dirname, '../')
const workspace = resolve(root, 'pnpm-workspace.yaml')

class GitPNPMMonorepo extends Git {
  static disablePlugin() {
    return ['git']
  }

  getInitialOptions(options, namespace) {
    options[namespace] = options.git
    return options[namespace]
  }

  async init() {
    await super.init()

    if (!await this.isPNPMAuthentication()) {
      throw new Error('Not authenticated with npm. Ensure NPM_TOKEN is set')
    }

    const packages = yaml.load(await fs.readFile(workspace, 'utf-8')).packages.map(x => basename(x))
    const stagedJSONs = await glob(`${staged}/*.json`)
      .then(files => Promise.all(files.map(file => fs.readFile(file))))
      .then(files => files.map((file) => JSON.parse(file)))

    const stagedChanges = stagedJSONs
      .filter(fileData => packages.find(x => fileData.name.includes(x)))

    this.config.setContext({
      stagedChanges,
      affectedModules: stagedChanges.length,
      updateLog: stagedChanges.map(fileData => `${fileData.name}: ${fileData.latestVersion} -> ${fileData.version}`).join('\n'),
      aggregateChangelog: stagedChanges.flatMap(fileData => [
        `# ${fileData.name} ${fileData.version}`,
        fileData.changelog
      ]).join('\n\n')
    })
  }

  // overwrites changelog for release notes
  async beforeRelease() {
    this.config.setContext({
      changelog: this.config.getContext('aggregateChangelog'),
    })

    return super.beforeRelease()
  }

  async release() {
    const { commit, tag, push, pnpm, changelog } = this.options
    await this.step({ enabled: changelog, task: () => this.writeChangelog(), label: 'Aggregated Changelog' })
    await this.step({ enabled: commit, task: () => this.commit(), label: 'Git commit' })
    await this.step({ enabled: tag, task: () => this.tag(), label: 'Git tag' })
    await this.step({ enabled: pnpm, task: () => this.pnpm(), label: 'Publish PNPM' })
    return !!(await this.step({ enabled: push, task: () => this.push(), label: 'Git push' }))
  }

  async tag({ annotation = this.options.tagAnnotation, args = this.options.tagArgs } = {}) {
    const context = this.config.getContext()
    const { stagedChanges } = context
    for (const stagedModule of stagedChanges.values()) {
      const message = format(annotation, { ...context, stagedModule })
      const tagName = format('${name}@${version}', stagedModule)

      try {
        await this.exec(['git', 'tag', '--annotate', '--message', message, ...fixArgs(args), tagName])
      } catch (e) {
        if (/tag '.+' already exists/.test(e)) {
          this.log.warn(`Tag "${tagName}" already exists`)
        } else {
          throw e
        }
      }
    }

    const message = format('Release ${version}', context)
    await this.exec(['git', 'tag', '--annotate', '--message', message, ...fixArgs(args), context.tagName])

    this.setContext({ isTagged: true })
  }

  async isPNPMAuthentication() {
    try {
      const username = await this.exec('pnpm whoami', { options: { write: false } })
      this.setContext({ username: username ? username.trim() : null })
    } catch (err) {
      this.debug(err)
      if (/code E40[04]/.test(err)) {
        this.log.warn('Ignoring response from unsupported `pnpm whoami` command.')
        return true
      }
      return false
    }

    return !!this.getContext('username')
  }

  async pnpm() {
    await this.exec(['pnpm', '-r', 'publish'])
  }

  async writeChangelog() {
    const { infile } = this.options
    const { isDryRun } = this.config
    const { aggregateChangelog } = this.config.getContext()

    let hasInfile = false
    try {
      await fs.access(infile)
      hasInfile = true
    } catch (err) {
      this.debug(err)
    }

    if (!isDryRun) {
      await prependFile(infile, aggregateChangelog + EOL + EOL)
    }

    if (!hasInfile) {
      await this.exec(`git add ${infile}`)
    }
  }

  commit({ message = this.options.commitMessage, args = this.options.commitArgs } = {}) {
    const msg = format(message, this.config.getContext())
    return this.exec(['git', 'commit', '--message', msg, ...fixArgs(args)]).then(
      () => this.setContext({ isCommitted: true }),
      err => {
        this.debug(err)
        if (/nothing (added )?to commit/.test(err) || /nichts zu committen/.test(err)) {
          this.log.warn('No changes to commit. The latest commit will be tagged.')
        } else {
          throw new Error(err)
        }
      }
    )
  }

  step(options) {
    const context = Object.assign({}, this.config.getContext(), { [this.namespace]: this.getContext() })
    const opts = Object.assign({}, options, { context })
    return this.spinner.show(opts)
  }
}

module.exports = GitPNPMMonorepo
