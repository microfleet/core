const Promise = require('bluebird');

function nestedTest(request) {
  return Promise.resolve(request.params);
}

nestedTest.schema = 'nested.test';

module.exports = nestedTest;
