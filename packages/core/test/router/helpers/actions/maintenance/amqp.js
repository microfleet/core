const { ActionTransport } = require('../../../../../src');

module.exports = function handler() {
  return { success: true }
}

module.exports.transports = [ActionTransport.amqp]
