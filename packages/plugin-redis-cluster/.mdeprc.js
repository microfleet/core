const { basename } = require('path')
const dir = basename(__dirname)

module.exports = {
  ...require('../../.mdeprc.cjs'),
  auto_compose: true,
  "parallel": 3,
  "services": [
    "redisCluster"
  ],
  http: true,
  "test_framework": 'jest --config ./jest.config.js --runTestsByPath --verbose --colors',
  "tests": '__tests__/*.spec.ts',
  root: `/src/packages/${dir}/node_modules/.bin`,
  extras: {
    tester: {
      working_dir: `/src/packages/${dir}`,
      environment: {
        NODE_OPTIONS: "--experimental-vm-modules",
      }
    }
  }
}
