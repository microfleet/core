const fs = require('fs')
const path = require('path')
const dir = path.basename(__dirname)

module.exports = {
  ...require('../../.mdeprc.js'),
  nycCoverage: false,
  auto_compose: true,
  node: "16",
  "parallel": 3,
  "test_framework": "jest --config ./jest.config.js --runTestsByPath --runInBand",
  "tests": "__tests__/*.spec.ts",
  root: `/src/packages/${dir}/node_modules/.bin`,
  extras: {
    tester: {
      working_dir: `/src/packages/${dir}`,
    }
  }
}

try {
  const filepath = path.join(__dirname, '.env')
  if (fs.statSync(filepath).isFile()) {
    module.exports.extras.tester.env_file = [filepath]
    return
  }
} catch (e) {
  Object.assign(module.exports.extras.tester.environment, {
    AWS_ELASTIC_KEY_ID: "${AWS_ELASTIC_KEY_ID}",
    AWS_ELASTIC_ACCESS_KEY: "${AWS_ELASTIC_ACCESS_KEY}",
    AWS_ELASTIC_NODE: "${AWS_ELASTIC_NODE}"
  })
}
