module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ["<rootDir>/packages"],
  maxConcurrency: 1,
  testTimeout: 30000,
  moduleNameMapper: {
    // @todo
    // '@microfleet/core/lib/(.*)': '<rootDir>/packages/core/lib/$1',
    '^@microfleet/((?:plugin-|core|utils).*)$': '<rootDir>/packages/$1/src',
  },
}
