module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '@microfleet/core/lib/(.*)': '<rootDir>/packages/core/lib/$1',
    '@microfleet/((?:plugin-|core).*)': '<rootDir>/packages/$1/src'
  }
}
