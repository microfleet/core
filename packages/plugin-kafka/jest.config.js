const globalConfig = require('../../jest.config')

module.exports = {
  ...globalConfig,
  verbose: true,
  rootDir: '../../',
  collectCoverage: true,
  coverageDirectory: 'packages/plugin-kafka/coverage',
  coverageReporters: [ "text-summary", "json", "lcov" ],
  collectCoverageFrom: [
    'packages/plugin-kafka/src/**/*',
  ],
  setupFilesAfterEnv: [
    "./packages/plugin-kafka/__tests__/jest.setup.js"
  ]
}
