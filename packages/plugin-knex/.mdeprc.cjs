const { basename } = require('path')
const dir = basename(__dirname)

module.exports = {
  ...require('../../.mdeprc.cjs'),
  auto_compose: true,
  "parallel": 3,
  "test_framework": "jest --config ./jest.config.js --runTestsByPath --runInBand",
  "tests": "__tests__/*.spec.ts",
  "services": [
    "postgres"
  ],
  root: `/src/packages/${dir}/node_modules/.bin`,
  extras: {
    postgres: {
      image: 'postgres:15-alpine',
    },
    tester: {
      working_dir: `/src/packages/${dir}`,
      environment: {
        NODE_OPTIONS: "--experimental-vm-modules",
      }
    }
  }
}
