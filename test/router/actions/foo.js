const Promise = require('bluebird');

module.exports = {
  handler: function (request) {
    return Promise.resolve(request);
  },
  transports: ['amqp', 'http', 'socketIO'],
};
