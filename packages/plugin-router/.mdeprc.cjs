const { basename } = require('path')
const dir = basename(__dirname)

module.exports = {
  ...require('../../.mdeprc.cjs'),
  auto_compose: true,
  parallel: 1,
  // test_framework: 'c8 ./node_modules/.bin/mocha',
  test_framework: 'jest --config ./jest.config.js --runTestsByPath',
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
      // volumes: [
      //   `/src/packages/${dir}/.tsimp`
      // ],
      environment: {
        // DEBUG: 'test',
        UV_THREADPOOL_SIZE: 8,
        NODE_OPTIONS: "--experimental-vm-modules",
        // SWC_NODE_PROJECT: './tsconfig.test.json' // otherwise swc wont transpile files
      }
    }
  }
}
