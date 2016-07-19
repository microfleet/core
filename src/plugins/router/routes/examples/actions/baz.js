const Promise = require('bluebird');

module.exports = {
  handler: () => Promise.resolve('bar'),
  transports: ['socketIO'],
};
