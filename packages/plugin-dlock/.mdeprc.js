const { basename } = require('path')
const dir = basename(__dirname)

module.exports = {
  nycCoverage: false,
  coverage: false,
  auto_compose: true,
  node: "16",
  parallel: 3,
  in_one: true,
  http: true,
  test_framework: 'jest --config ./jest.config.js --runTestsByPath --maxWorkers=50% --verbose --colors',
  tests: '__tests__/*.spec.ts',
  root: `/src/packages/${dir}/node_modules/.bin`,
  extras: {
    tester: {
      working_dir: `/src/packages/${dir}`,
      volumes: [
        '${PWD}/../..:/src:cached'
      ]
    }
  },
  services: [
    'redisSentinel',
    'redisCluster',
  ],
}
