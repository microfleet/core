const { ActionTransport } = require('../../../');
const getSocketIORouterAdapter = require('./adapter');
const wildcardMiddleware = require('socketio-wildcard')();
const verifyPossibility = require('../../router/verifyAttachPossibility');

function attachSocketIORouter(socketIO, config, router) {
  verifyPossibility(router, ActionTransport.socketIO);
  socketIO.use(wildcardMiddleware);
  socketIO.on('connection', getSocketIORouterAdapter(config, router));
}

module.exports = attachSocketIORouter;
