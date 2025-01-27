const { basename } = require('node:path')
const dir = basename(__dirname)

module.exports = {
  ...require('../../.mdeprc.cjs'),
  auto_compose: true,
  services: ["rabbitmq"],
  root: '/src/node_modules/.bin',
  test_framework: "tsx --test",
  tests: "__tests__/suites/*.spec.ts",
  extras: {
    tester: {
      working_dir: `/src/packages/${dir}`,
    }
  }
}
