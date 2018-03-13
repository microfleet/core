// @flow
import typeof SocketIO from 'socket.io';
import type { Router } from '@microfleet/plugin-router/src/factory';

const { ActionTransport } = require('@microfleet/config').constants;
const wildcardMiddleware = require('socketio-wildcard')();
const verifyPossibility = require('@microfleet/plugin-router/src/verifyAttachPossibility');
const getSocketIORouterAdapter = require('./adapter');

function attachSocketIORouter(socketIO: SocketIO, config: Object, router: Router) {
  verifyPossibility(router, ActionTransport.socketIO);

  // due to changes in socket.io@2.0.2 we must attach server before using .use for adding middleware
  // otherwise it crashes
  const { attach } = socketIO;

  // NOTE: overwrites listen & attach functions so that we can init middleware after we have connected
  // a server to socket.io instance
  socketIO.attach = socketIO.listen = function listen(...args) {
    attach.apply(this, args);
    socketIO.use(wildcardMiddleware);
  };

  socketIO.on('connection', getSocketIORouterAdapter(config, router));
}

module.exports = attachSocketIORouter;
