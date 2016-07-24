const { ActionTransport } = require('./../../../');
const Promise = require('bluebird');

function getSocketIORouterAdapter(config, router) {
  return function socketIORouterAdapter(socket) {
    const extension = router.extensions;

    socket.on(config.actionEvent, (params, callback) => {
      const actionName = params[config.requestActionKey];
      let request = { params, transport: ActionTransport.socketIO };
      let preRequest;

      if (extension.has('preSocketIORequest')) {
        preRequest = extension.exec('preSocketIORequest', [socket, request], router.service);
        // @todo if error response error
      } else {
        preRequest = Promise.resolve();
      }

      return preRequest
        .return([actionName, request, callback])
        .bind(router)
        .spread(router.dispatch)
        .asCallback(() => {
          request = null;
        });
    });
  };
}

module.exports = getSocketIORouterAdapter;
