const { basename } = require('path')
const dir = basename(__dirname)

module.exports = {
  ...require('../../.mdeprc.cjs'),
  nycCoverage: false,
  auto_compose: true,
  "parallel": 3,
  "test_framework": "jest --config ./jest.config.js --runTestsByPath --runInBand",
  "tests": "__tests__/*.spec.ts",
  "services": [
    "couchdb"
  ],
  root: `/src/packages/${dir}/node_modules/.bin`,
  extras: {
    tester: {
      working_dir: `/src/packages/${dir}`,
    },
    "couchdb": {
      "ports": ["5984:5984"]
    }
  }
}
