const { basename } = require('path')
const dir = basename(__dirname)

module.exports = {
  ...require('../../.mdeprc.js'),
  nycCoverage: false,
  auto_compose: true,
  node: "18",
  "tester_flavour": "rdkafka-tester",
  http: false,
  "test_framework": "jest --config ./jest.config.js --runTestsByPath --maxWorkers=50% --colors --verbose",
  "tests": "__tests__/**/*.spec.ts",
  root: `/src/packages/${dir}/node_modules/.bin`,
  euser: 'node',
  tuser: 'node',
  arbitrary_exec: [
    'npm rebuild @makeomatic/node-rdkafka',
  ],
  extras: {
    tester: {
      working_dir: `/src/packages/${dir}`,
    }
  }
}
