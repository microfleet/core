const Promise = require('bluebird')
const { ActionTransport } = require('../../../../../../../')

function BarAction() {
  return Promise.resolve('bar')
}

BarAction.transports = [ActionTransport.http]

module.exports = BarAction
