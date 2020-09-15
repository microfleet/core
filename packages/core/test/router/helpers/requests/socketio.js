const Promise = require('bluebird');

function getSocketioRequest(client) {
  return (action, params) => Promise.fromCallback((callback) => client.emit(action, params, callback));
}

module.exports = getSocketioRequest;
