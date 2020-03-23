const globalConfig = require('../../jest.config')

module.exports = {
  ...globalConfig,
  verbose: true,
  rootDir: '../../',
  setupFilesAfterEnv: [
    "./packages/plugin-kafka/__tests__/jest.setup.js"
  ]
}
