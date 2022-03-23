const { basename } = require('path')
const dir = basename(__dirname)

module.exports = {
  ...require('../../.mdeprc.js'),
  nycCoverage: false,
  coverage: false,
  auto_compose: true,
  node: '16',
  parallel: 3,
  test_framework: 'jest --config ./jest.config.js --runTestsByPath',
  tests: '__tests__/**/*.spec.ts',
  services: [
    'rabbitmq',
  ],
  root: `/src/packages/${dir}/node_modules/.bin`,
  extras: {
    tester: {
      working_dir: `/src/packages/${dir}`,
      environment: {
        DEBUG: process.env.DEBUG,
      }
    }
  }
}
