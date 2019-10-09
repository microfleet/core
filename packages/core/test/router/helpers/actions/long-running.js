const { ActionTransport } = require('./../../../../src');
const Promise = require('bluebird');

function LongAction(request) {
  const { params } = request;
  const delay = params.pause || 100;
  this.log.debug('got params', { params });
  return Promise.delay(delay).then(() => {
    this.log.debug('delayed response', { params });
    return {
      success: true,
        params
    }
  });
}

LongAction.transports = [
  ActionTransport.amqp,
  ActionTransport.http,
  ActionTransport.socketIO,
];

module.exports = LongAction;
