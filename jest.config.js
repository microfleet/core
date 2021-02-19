module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    // @todo
    // '@microfleet/core/lib/(.*)': '<rootDir>/packages/core/lib/$1',
    '@microfleet\/((?:plugin-|core|utils).*)': '<rootDir>/packages/$1/src',
  },
}
