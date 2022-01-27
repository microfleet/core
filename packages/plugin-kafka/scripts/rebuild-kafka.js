/* eslint-disable @typescript-eslint/no-var-requires */
const { resolve } = require('path')
const { sync } = require('execa')

const parentPath = '../'

function rebuildKafka() {
  const parentProjectPath = resolve(__dirname, parentPath)
  sync('pnpm', ['rebuild', 'node-rdkafka'], { cwd: parentProjectPath })
}

try {
  require('node-rdkafka')
} catch {
  // eslint-disable-next-line no-console
  console.debug('Rebuilding `node-rdkafka`')
  rebuildKafka()
}
