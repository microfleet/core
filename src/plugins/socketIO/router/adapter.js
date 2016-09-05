const { ActionTransport } = require('../../../');
const Promise = require('bluebird');

function getSocketIORouterAdapter(config, router) {
  return function socketIORouterAdapter(socket) {
    socket.on('*', packet => {
      const [actionName, params, callback] = packet.data;
      const request = { params, socket, transport: ActionTransport.socketIO };

      return Promise
        .bind(router, [actionName, request, callback])
        .spread(router.dispatch);
    });
  };
}

module.exports = getSocketIORouterAdapter;
