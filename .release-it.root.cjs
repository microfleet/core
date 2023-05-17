const path = require('path')
const { globSync } = require('glob')

/* THIS IS A QUICK FALLBACK WHEN THERE ARE NO RELEASES */
const staged = globSync('./ci/staged/*.json', { cwd: __dirname })
if (staged.length === 0) {
  module.exports = {
    git: false,
    npm: false,
    github: false,
    'disable-metrics': true,
  }
  return
}

module.exports = {
  git: {
    requireCleanWorkingDir: false,
    tag: true,
    commit: true,
    requireBranch: 'master',
    commitMessage: 'chore(release): v${version} -- updated ${affectedModules} modules [skip ci]\n\n${updateLog}',
    tagName: 'microfleet@v${version}',
    tagAnnotation: 'Release ${stagedModule.version}\n\n${stagedModule.changelog}',
    pnpm: true,
    changelog: true,
    infile: 'CHANGELOG.md',
  },
  npm: {
    publish: false,
  },
  github: false,
  plugins: {
    '@release-it/conventional-changelog': {
      infile: false,
      preset: {
        name: 'angular',
        parserOpts: {
          noteKeywords: ["BREAKING CHANGE", "BREAKING CHANGES", "BREAKING"]
        }
      }
    },
    [path.resolve(__dirname, './ci/pnpm-git.js')]: {},
    [require.resolve('release-it/lib/plugin/github/GitHub')]: {
      release: true,
      releaseName: "Release ${version}",
      releaseNotes: null,
      preRelease: false,
      draft: false,
      tokenRef: "GITHUB_TOKEN",
      assets: null,
      host: null,
      timeout: 0,
      proxy: null,
      skipChecks: false
    },
  },
  'disable-metrics': true,
}
