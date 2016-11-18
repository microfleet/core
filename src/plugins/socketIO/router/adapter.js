const { ActionTransport } = require('../../../');
const Promise = require('bluebird');
const debug = require('debug')('mservice:router:socket.io');

function getSocketIORouterAdapter(config, router) {
  return function socketIORouterAdapter(socket) {
    socket.on('*', (packet) => {
      const [actionName, params, callback] = packet.data;
      const request = {
        params,
        query: {},
        socket,
        // default method to the transport for similar interfaces
        method: ActionTransport.socketIO,
        transport: ActionTransport.socketIO,
      };

      debug('prepared request with', packet.data);

      return Promise
        .bind(router, [actionName, request, callback])
        .spread(router.dispatch);
    });
  };
}

module.exports = getSocketIORouterAdapter;
