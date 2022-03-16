const { basename } = require('path')
const dir = basename(__dirname)

module.exports = {
  ...require('../../.mdeprc.js'),
  nycCoverage: false,
  coverage: false,
  auto_compose: true,
  node: '16',
  parallel: 1,
  test_framework: 'jest --config ./jest.config.js --runTestsByPath --maxWorkers=1 --verbose --colors',
  tests: '__tests__/**/*.spec.ts',
  services: [
    'rabbitmq',
  ],
  in_one: true,
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
