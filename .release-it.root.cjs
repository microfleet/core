const path = require('path')

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
    },
  },
  'disable-metrics': true,
}
