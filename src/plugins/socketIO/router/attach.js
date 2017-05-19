// @flow
import typeof SocketIO from 'socket.io';
import type { Router } from '../../router/factory';

const { ActionTransport } = require('../../../constants');
const getSocketIORouterAdapter = require('./adapter');
const wildcardMiddleware = require('socketio-wildcard')();
const verifyPossibility = require('../../router/verifyAttachPossibility');

function attachSocketIORouter(socketIO: SocketIO, config: Object, router: Router) {
  verifyPossibility(router, ActionTransport.socketIO);
  socketIO.use(wildcardMiddleware);
  socketIO.on('connection', getSocketIORouterAdapter(config, router));
}

module.exports = attachSocketIORouter;
