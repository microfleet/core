const { resolve } = require('path');
const { sync } = require('execa');

const parentPath = '../';

function rebuildKafka() {
  const parentProjectPath = resolve(__dirname, parentPath);
  sync('npm', ['rebuild', 'node-rdkafka'], { cwd: parentProjectPath })
}

try {
  require('node-rdkafka');
} catch {
  console.debug('Rebuilding `node-rdkafka`');
  rebuildKafka();
}
