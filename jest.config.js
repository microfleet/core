module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js'
  ],
  moduleNameMapper: {
    '@microfleet/((?:iap|rbac).*)': '<rootDir>/packages/$1/src'
  },
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  projects: [
    "<rootDir>/packages/*/__tests__/**/*.test.(ts|tsx)"
  ]
};
