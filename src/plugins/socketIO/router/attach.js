const { ActionTransport } = require('../../../');
const getSocketIORouterAdapter = require('./adapter');
const verifyPossibility = require('../../router/verifyAttachPossibility');

function attachSocketIORouter(socketIO, config, router) {
  verifyPossibility(router, ActionTransport.socketIO);
  socketIO.on('connection', getSocketIORouterAdapter(config, router));
}

module.exports = attachSocketIORouter;
