const { basename } = require('node:path')
const dir = basename(__dirname)

module.exports = {
  ...require('../../.mdeprc.cjs'),
  services: ["elasticsearch"],
  auto_compose: true,
  root: '/src/node_modules/.bin',
  test_framework: "tsx --test",
  tests: "__tests__/**/*.spec.ts",
  extras: {
    tester: {
      working_dir: `/src/packages/${dir}`,
    }
  }
}
