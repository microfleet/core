const Promise = require('bluebird');

module.exports = {
  handler: request => Promise.resolve(request.params),
  transports: ['socketIO']
};
