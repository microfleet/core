const eos = require('end-of-stream');
const Promise = require('bluebird');
const { ActionTransport } = require('../../../src');

const storage = new Map();
function EchoAction(request) {
  const client = request.headers.get('client_id');
  const store = storage.get(client) || [];
  store.push(request.params.text);

  return Promise.from(c)
}

EchoAction.transports = [ActionTransport.gRPC];

module.exports = EchoAction;
