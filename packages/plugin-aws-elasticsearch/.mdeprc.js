const fs = require('fs')
const path = require('path')

module.exports = {
  "nycCoverage": false,
  "coverage": false,
  "auto_compose": true,
  "node": "14",
  "parallel": 3,
  "test_framework": "jest --config ../../jest.config.js --runTestsByPath --runInBand",
  "tests": "__tests__/*.spec.ts",
  "extras": {
    "tester": {
      "working_dir": "/src/packages/plugin-aws-elasticsearch",
      "volumes": [
        "${PWD}/../../:/src:cached"
      ],
      environment: {
        TS_NODE_TRANSPILE_ONLY: "true",
        TS_NODE_TYPE_CHECK: "false",
        TS_NODE_FILES: "true",
      }
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
