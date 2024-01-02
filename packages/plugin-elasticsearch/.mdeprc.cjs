const { basename } = require('path')
const dir = basename(__dirname)

module.exports = {
  ...require('../../.mdeprc.cjs'),
  auto_compose: true,
  "parallel": 3,
  "services": [
    "elasticsearch"
  ],
  "test_framework": 'jest --config ./jest.config.js --runTestsByPath --runInBand --verbose --colors',
  "tests": '__tests__/*.spec.ts',
  root: `/src/packages/${dir}/node_modules/.bin`,
  extras: {
    tester: {
      working_dir: `/src/packages/${dir}`
    }
  }
}