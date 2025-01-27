const { basename } = require('node:path')
const dir = basename(__dirname)

module.exports = {
  ...require('../../.mdeprc.cjs'),
  auto_compose: true,
  root: '/src/node_modules/.bin',
  test_framework: "tsx --test",
  tests: "__tests__/**/*.spec.ts",
  services: ['postgres'],
  extras: {
    postgres: {
      image: 'postgres:17-alpine',
    },
    tester: {
      working_dir: `/src/packages/${dir}`,
    }
  }
}
