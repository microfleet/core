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
  coverageDirectory: 'packages/plugin-redis-sentinel/coverage',
  coverageReporters: [ "text-summary", "json", "lcov" ],
  collectCoverageFrom: [
    'packages/plugin-redis-sentinel/src/**/*',
  ]
}
