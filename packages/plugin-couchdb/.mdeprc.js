module.exports = {
  "nycCoverage": false,
  "coverage": false,
  "auto_compose": true,
  "node": "16",
  "parallel": 3,
  "test_framework": "jest --config ./jest.config.js --runTestsByPath --runInBand",
  "tests": "__tests__/*.spec.ts",
  "services": [
    "couchdb"
  ],
  "extras": {
    "tester": {
      "working_dir": "/src/packages/plugin-couchdb",
      volumes: [
        '${PWD}/../..:/src:cached',
        '${PWD}/../../node_modules:/src/node_modules:cached',
      ],
      environment: {
        TS_NODE_TRANSPILE_ONLY: "true",
        TS_NODE_TYPE_CHECK: "false",
        TS_NODE_FILES: "true"
      }
    },
    "couchdb": {
      "ports": ["5984:5984"]
    }
  }
}
