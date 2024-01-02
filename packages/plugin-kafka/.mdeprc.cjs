const { userInfo } = require('node:os')
const { basename } = require('path')
const dir = basename(__dirname)

const { uid } = userInfo()

module.exports = {
  ...require('../../.mdeprc.cjs'),
  auto_compose: true,
  tester_flavour: "rdkafka-tester",
  http: false,
  test_framework: "jest --config ./jest.config.js --runTestsByPath --maxWorkers=50% --colors --verbose",
  tests: "__tests__/**/*.spec.ts",
  root: `/src/packages/${dir}/node_modules/.bin`,
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
