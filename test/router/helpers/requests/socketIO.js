const Promise = require('bluebird');

function getSocketIORequest(client) {
  return params => Promise.fromCallback(callback => client.emit('action', params, callback));
}

module.exports = getSocketIORequest;
