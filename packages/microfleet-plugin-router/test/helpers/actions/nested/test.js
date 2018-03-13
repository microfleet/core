const Promise = require('bluebird');

function nestedTest(request) {
  return Promise.resolve(request.params);
}

module.exports = nestedTest;
