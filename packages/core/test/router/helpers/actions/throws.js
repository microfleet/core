const { HttpStatusError } = require('common-errors');
const { ActionTransport } = require('../../../..');

module.exports = function handler() {
  throw new HttpStatusError(202, 'ok');
};

module.exports.transports = [ActionTransport.amqp];
