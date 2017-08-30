const Promise = require('bluebird');

function fooBarAction(request) {
  return Promise.resolve(request.params);
}

fooBarAction.schema = 'foo.baz';

module.exports = fooBarAction;
