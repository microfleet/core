module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '@microfleet/((?:plugin-|core).*)': '<rootDir>/packages/$1/src'
  }
};
