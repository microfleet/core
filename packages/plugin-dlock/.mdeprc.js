module.exports = {
  nycCoverage: false,
  coverage: false,
  auto_compose: true,
  node: "12",
  parallel: 3,
  tests: '__tests__/*.spec.ts',
  extras: {
    tester: {
      working_dir: '/src/packages/plugin-dlock',
      volumes: [
        '${PWD}/../../:/src:cached'
      ],
    },
  },
  services: [
    'redisSentinel',
    'redisCluster',
  ],
}
