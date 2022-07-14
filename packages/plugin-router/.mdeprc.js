const { basename } = require('path')
const dir = basename(__dirname)

module.exports = {
  ...require('../../.mdeprc.js'),
  nycCoverage: false,
  auto_compose: true,
  node: '16',
  parallel: 1,
  test_framework: 'jest --config ./jest.config.js --runTestsByPath --runInBand --verbose --colors',
  tests: '__tests__/**/{request-count-track,runner,graceful-shutdown,router}.spec.ts',
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
