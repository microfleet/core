// eslint-disable-next-line @typescript-eslint/no-var-requires
const globalConfig = require('../../jest.config')

module.exports = {
  ...globalConfig,
  verbose: true,
  rootDir: '../../',
  globals: {
    'ts-jest': {
      isolatedModules: true,
    },
  },
  collectCoverage: true,
  coverageDirectory: 'packages/plugin-kafka/coverage',
  coverageReporters: [ "text-summary", "json", "lcov" ],
  collectCoverageFrom: [
    'packages/plugin-kafka/src/**/*',
  ],
  testTimeout: 60000,
}
