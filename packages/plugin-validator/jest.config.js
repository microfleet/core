/* eslint-disable @typescript-eslint/no-var-requires */

const { basename, resolve } = require('path')
const globalConfig = require('../../jest.config')
const dir = basename(__dirname)

module.exports = {
  ...globalConfig,
  rootDir: '../../',
  globals: {
    'ts-jest': {
      isolatedModules: true,
      tsconfig: resolve(__dirname, 'tsconfig.json')
    },
  },
  collectCoverage: true,
  coverageDirectory: `packages/${dir}/coverage`,
  coverageReporters: [ "text-summary", "json", "lcov" ],
  collectCoverageFrom: [
    `packages/${dir}/src/**/*`,
  ],
}
