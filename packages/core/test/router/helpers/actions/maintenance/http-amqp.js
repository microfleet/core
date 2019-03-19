const { ActionTransport } = require('../../../../../src');

module.exports = async function handler() {
  await this.amqp.publishAndWait('maintenance.amqp', {
    some: 'data'
  })
  return { success: true }
}

module.exports.transports = [ActionTransport.http]
module.exports.readonly = true
