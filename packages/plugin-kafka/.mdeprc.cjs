const { userInfo } = require('node:os')
const { basename } = require('node:path')
const dir = basename(__dirname)

const { uid } = userInfo()

module.exports = {
  ...require('../../.mdeprc.cjs'),
  tester_flavour: "rdkafka-tester",
  auto_compose: true,
  root: '/src/node_modules/.bin',
  test_framework: "tsx --test",
  tests: "__tests__/**/*.spec.ts",
  euser: uid,
  tuser: uid,
  arbitrary_exec: [
    'npm rebuild @makeomatic/node-rdkafka',
  ],
  extras: {
    tester: {
      working_dir: `/src/packages/${dir}`,
    }
  }
}
