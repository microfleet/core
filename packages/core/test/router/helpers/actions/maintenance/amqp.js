const { ActionTransport } = require('@microfleet/core')

module.exports = function handler() {
  return { success: true }
}

module.exports.transports = [ActionTransport.amqp]
