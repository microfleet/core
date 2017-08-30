const Promise = require('bluebird');

function fooBarAction(request) {
  return Promise.resolve(request.params);
}

module.exports = fooBarAction;
