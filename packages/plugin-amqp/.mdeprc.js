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
  services: [
    'rabbitmq',
  ],
  tests: '__tests__/**/*.spec.ts',
  root: `/src/packages/${dir}/node_modules/.bin`,
  extras: {
    tester: {
      working_dir: `/src/packages/${dir}`,
    }
  }
}
