const { basename } = require('path')
const dir = basename(__dirname)

module.exports = {
  "nycCoverage": false,
  "coverage": false,
  "auto_compose": true,
  "node": "16",
  "tester_flavour": "rdkafka-tester",
  http: false,
  "test_framework": "jest --config ./jest.config.js --runTestsByPath --maxWorkers=50% --colors --verbose",
  "tests": "__tests__/**/*.spec.ts",
  "arbitrary_exec": ["node scripts/rebuild-kafka.js"],
  root: `/src/packages/${dir}/node_modules/.bin`,
  extras: {
    tester: {
      working_dir: `/src/packages/${dir}`,
      volumes: [
        '${PWD}/../..:/src:cached'
      ]
    }
  }
}
