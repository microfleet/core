module.exports = {
  preset: 'ts-jest',
  moduleNameMapper: {
    '@microfleet/((?:plugin-|core).*)': '<rootDir>/packages/$1/src'
  }
};
