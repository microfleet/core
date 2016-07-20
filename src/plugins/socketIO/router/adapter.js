const Promise = require('bluebird');

function getSocketIORouterAdapter(config, router) {
  return function socketIORouterAdapter(socket) {
    const extension = router.extensions;

    socket.on(config.actionEvent, (params, callback) => {
      let request = { params };
      let preRequest;

      if (extension.has('preSocketIORequest')) {
        preRequest = extension.exec('preSocketIORequest', socket, request);
      } else {
        preRequest = Promise.resolve();
      }

      return preRequest
        .then(() => {
          const actionName = params[config.requestActionKey];
          const routes = router.routes.socketIO;

          return router.dispatcher(actionName, routes, request, callback);
        })
        // @todo if error response error
        .asCallback(() => {
          request = null;
        });
    });
  };
}

module.exports = getSocketIORouterAdapter;
