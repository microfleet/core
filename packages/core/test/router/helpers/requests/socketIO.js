const Promise = require('bluebird');

function getSocketIORequest(client) {
  return (action, params) => Promise.fromCallback(callback => client.emit(action, params, callback));
}

module.exports = getSocketIORequest;
