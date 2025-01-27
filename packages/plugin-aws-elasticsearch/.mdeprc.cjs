const { basename } = require('node:path')
const dir = basename(__dirname)

module.exports = {
  ...require('../../.mdeprc.cjs'),
  auto_compose: true,
  root: '/src/node_modules/.bin',
  test_framework: "tsx --test",
  tests: "__tests__/**/*.spec.ts",
  extras: {
    tester: {
      working_dir: `/src/packages/${dir}`,
      environment: {},
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
