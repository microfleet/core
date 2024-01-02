const { basename } = require('path')
const dir = basename(__dirname)

module.exports = {
  ...require('../../.mdeprc.cjs'),
  nycCoverage: false,
  auto_compose: true,
  parallel: 1,
  test_framework: 'jest --config ./jest.config.js --runTestsByPath --runInBand --verbose --colors',
  tests: '__tests__/**/*.spec.ts',
  services: [
    'rabbitmq',
  ],
  http: true,
  in_one: false,
  root: `/src/packages/${dir}/node_modules/.bin`,
  extras: {
    tester: {
      working_dir: `/src/packages/${dir}`,
      environment: {
        // DEBUG: 'test',
        UV_THREADPOOL_SIZE: 8,
      }
    }
  }
}
