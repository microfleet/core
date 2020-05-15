module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '@microfleet/((?:plugin-).*(?:types))': '<rootDir>/packages/$1',
    '@microfleet/((?:plugin-|core).*)': '<rootDir>/packages/$1/src'
  }
}
