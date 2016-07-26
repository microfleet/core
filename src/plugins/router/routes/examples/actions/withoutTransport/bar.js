const Promise = require('bluebird');

function BarAction() {
  return Promise.resolve('bar');
}

module.exports = BarAction;
