module.exports = {
  git: {
    changelog: 'git log --pretty=format:\"* %s (%h)\" \${from}...\${to} -- ./',
    commitMessage: 'chore: release v${version}',
    tagName: '${name}@${version}',
    commit: false,
    tag: false,
    push: false,
  },
  npm: {
    publish: false,
    ignoreVersion: true
  },
  plugins: {
    '@release-it/conventional-changelog': {
      infile: "CHANGELOG.md",
      preset: {
        name: 'angular',
        parserOpts: {
          noteKeywords: ["BREAKING CHANGE", "BREAKING CHANGES", "BREAKING"]
        }
      }
    }
  }
}
