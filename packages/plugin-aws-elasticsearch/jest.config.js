const globalConfig = require('../../jest.config')

module.exports = {
  ...globalConfig,
  verbose: true,
  rootDir: '../../',
  collectCoverage: true,
  coverageDirectory: 'packages/plugin-aws-elasticsearch/coverage',
  coverageReporters: ["text-summary", "json", "lcov"],
  collectCoverageFrom: [
    'packages/plugin-aws-elasticsearch/src/**/*',
  ],
  setupFilesAfterEnv: [
    "./packages/plugin-aws-elasticsearch/__tests__/jest.setup.js"
  ]
}
