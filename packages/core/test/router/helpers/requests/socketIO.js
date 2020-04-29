const Promise = require('bluebird');

function getSocketIORequest(client) {
  return (action, params, options) => Promise.fromCallback((callback) => client.emit(action, params, options, callback));
}

module.exports = getSocketIORequest;
