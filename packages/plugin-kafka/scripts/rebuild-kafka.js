const { resolve } = require('path');
const { execSync } = require('child_process');

const parentPath = '../../../';

function rebuildKafka() {
  const parentProjectPath = resolve(__dirname, parentPath);
  execSync('npm rebuild node-rdkafka', {cwd: parentProjectPath, stdio:  ['inherit', 'inherit', 'inherit']})
}

(() => {
  try {
    require('node-rdkafka');
  } catch {
    console.debug('Rebuilding `node-rdkafka`');
    rebuildKafka();
  }
})()
