const Promise = require('bluebird')
const { ActionTransport } = require('../../../../../../../')

function FooAction() {
  return Promise.resolve('foo')
}

FooAction.transports = [ActionTransport.http, ActionTransport.socketIO]

module.exports = FooAction
