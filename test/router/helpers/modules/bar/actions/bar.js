const Promise = require('bluebird');

function barAction(request) {
  return Promise.resolve('bar');
}

module.exports = barAction;
