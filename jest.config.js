const { resolve } = require('node:path')
const cwd = process.cwd()
const transform = resolve(cwd, 'node_modules/@swc-node/jest')

module.exports = {
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.mts'],
  transform: {
    '^.+\\.(c?(t|j))sx?$': [transform, {
      dynamicImport: true,
      experimentalDecorators: true,
      emitDecoratorMetadata: true,
      target: 'es2022',
      module: 'commonjs',
    }],
    '^.+\\.mts$': [transform, {
      dynamicImport: true,
      experimentalDecorators: true,
      emitDecoratorMetadata: true,
      target: 'es2022',
      module: 'es6',
    }]
  },
  moduleFileExtensions: [
    'ts',
    'js',
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
