const { basename } = require('path')
const dir = basename(__dirname)

module.exports = {
  ...require('../../.mdeprc.js'),
  nycCoverage: false,
  auto_compose: true,
  node: "18",
  parallel: 3,
  test_framework: "jest --config ./jest.config.js --runTestsByPath --runInBand",
  tests: "__tests__/suites/*.spec.ts",
  root: `/src/packages/${dir}/node_modules/.bin`,
  services: [
    'rabbitmq',
  ],
  extras: {
    tester: {
      working_dir: `/src/packages/${dir}`,
    }
  }
}
