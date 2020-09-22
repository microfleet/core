const Promise = require('bluebird')
const { ActionTransport } = require('../../../../../../../')

function BazAction() {
  return Promise.resolve('bar')
}

BazAction.transports = [ActionTransport.socketIO]

module.exports = BazAction
