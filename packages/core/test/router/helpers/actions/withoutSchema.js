// eslint-disable-next-line unicorn/filename-case
const Promise = require('bluebird');

function withoutSchema(request) {
  return Promise.resolve(request.params);
}

module.exports = withoutSchema;
