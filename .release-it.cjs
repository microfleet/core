const path = require('path')
const cwd = process.cwd()
const pkg = path.resolve(cwd, 'package.json')
const { name } = require(pkg)

module.exports = {
  git: {
    changelog: 'git log --pretty=format:\"* %s (%h)\" \${from}...\${to} -- ./',
    commitMessage: 'chore(release): ${name} -- v${version}',
    tagName: `${name}@\${version}`,
    commit: false,
    tag: false,
    push: false,
    requireCleanWorkingDir: false,
    requireBranch: 'master'
  },
  npm: {
    publish: false,
    ignoreVersion: false,
  },
  plugins: {
    [path.resolve(__dirname, './ci/aggregate-npm.js')]: {},
    [path.resolve(__dirname, './ci/aggregate-conventional-changelog.js')]: {
      infile: "CHANGELOG.md",
      preset: {
        name: path.resolve(__dirname, './ci/conventional-changelog-microfleet.js'),
        parserOpts: {
          noteKeywords: ["BREAKING CHANGE", "BREAKING CHANGES", "BREAKING"]
        },
      },
    },
    [path.resolve(__dirname, './ci/aggregate-release.js')]: {},
  },
  'disable-metrics': true,
}
