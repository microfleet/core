/* eslint-disable @typescript-eslint/no-var-requires */

const { basename } = require('node:path')
const globalConfig = require('../../jest.config')
const dir = basename(__dirname)

module.exports = {
  ...globalConfig,
  rootDir: '../../',
  bail: 1,
  collectCoverage: true,
  coverageDirectory: `packages/${dir}/coverage`,
  coverageReporters: [ "text-summary", "json", "lcov" ],
  collectCoverageFrom: [
    `packages/${dir}/src/**/*`,
  ],
}
