module.exports = {
  "nycCoverage": false,
  "coverage": false,
  "auto_compose": true,
  "node": "14",
  "parallel": 3,
  "services": [
    "redisSentinel",
    "redisCluster",
    "rabbitmq",
    "elasticsearch"
  ],
  "extras": {
    "tester": {
      "working_dir": "/src/packages/core",
      "volumes": [
        "${PWD}/../../:/src:cached"
      ],
      "environment": {
        "TS_NODE_TRANSPILE_ONLY": "true",
        "TS_NODE_TYPE_CHECK": "false",
        "DEBUG": "${DEBUG}"
      }
    }
  }
}
