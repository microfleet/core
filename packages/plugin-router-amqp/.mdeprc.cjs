const { basename } = require('path')
const dir = basename(__dirname)

module.exports = {
  ...require('../../.mdeprc.cjs'),
  auto_compose: true,
  node: '20',
  parallel: 3,
  test_framework: 'jest --config ./jest.config.js --runTestsByPath',
  tests: '__tests__/**/*.spec.ts',
  services: [
    'rabbitmq',
  ],
  root: `/src/packages/${dir}/node_modules/.bin`,
  extras: {
    rabbitmq: {
      ports: ['15672']
    },
    tester: {
      working_dir: `/src/packages/${dir}`,
      environment: {
        NODE_OPTIONS: "--experimental-vm-modules",
        DEBUG: process.env.DEBUG,
      }
    }
  }
}
