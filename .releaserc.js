module.exports = {
  branch: 'master',
  monorepo: {
    analyzeCommits: {
      preset: 'angular',
      releaseRules: [
        { type: 'docs', release: 'patch' },
        { type: 'refactor', release: 'patch' },
        { type: 'style', release: 'patch' },
        { type: 'minor', release: 'minor' },
        { type: 'patch', release: 'patch' },
        { type: 'major', release: 'major' },
        { type: 'breaking', release: 'major' }
      ]
    },
  },
  verifyConditions: [],
  verifyRelease: ['@semantic-release/npm', '@semantic-release/github']
    .map(require)
    .map(x => x.verifyConditions),
  prepare: [
    '@semantic-release/npm',
    '@semantic-release/git'
  ],
  publish: [
    '@semantic-release/npm',
    '@semantic-release/github'
  ],
};
