const Promise = require('bluebird');

module.exports = {
  auth: 'token',
  allowed: function (request) {
    return Promise.resolve(request)
  },
  handler: function (request) {
    return Promise.resolve('success');
  },
  transports: ['http', 'socketIO'],
  isAllowed: (request, service) => {
    return true;
  }
};
