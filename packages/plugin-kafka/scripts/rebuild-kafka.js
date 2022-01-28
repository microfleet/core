/* eslint-disable @typescript-eslint/no-var-requires, no-console */
const { resolve } = require('path')
const { sync } = require('execa')

const parentPath = '../'
const parentProjectPath = resolve(__dirname, parentPath)

function rebuildKafka() {
  sync('npm', ['rebuild', 'node-rdkafka'], { cwd: parentProjectPath })
}

function testSigSegv() {
  const cmd = `
    const kafka = require("node-rdkafka");
    console.log(kafka.librdkafkaVersion)
    const pKafka = require('./').RdKafkaCodes
    console.log(pKafka)
  `

  sync('node', ['-e', cmd], { cwd: parentProjectPath })
}

try {
  testSigSegv()
} catch (e) {
  console.error(e.shortMessage)
  console.debug('Rebuilding `node-rdkafka` becase of ^')
  rebuildKafka()
}
