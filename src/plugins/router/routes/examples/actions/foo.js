const Promise = require('bluebird');

module.exports = {
  handler: () => Promise.resolve('foo'),
  transports: ['http', 'socketIO'],
};
