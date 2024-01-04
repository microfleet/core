const { resolve } = require('node:path')
const esBuildTransform = resolve(__dirname, 'ci/esbuild-transform.js')

module.exports = {
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.mts'],
  transform: {
    '^.+\\.[cm]?[tj]sx?$': [esBuildTransform]
  },
  moduleFileExtensions: [
    'ts',
    'js',
    'mts',
    'cts',
    'cjs',
    'mjs',
    'json',
    'node',
  ],
  roots: ["<rootDir>/packages"],
  maxConcurrency: 1,
  testTimeout: 30000,
  moduleNameMapper: {
    // @todo
    // '@microfleet/core/lib/(.*)': '<rootDir>/packages/core/lib/$1',
    '^@microfleet/((?:plugin-|core|utils).*)$': '<rootDir>/packages/$1/src',
  },
}
