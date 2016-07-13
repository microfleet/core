const Promise = require('bluebird');

function getSocketIORouter(config, router) {
  return function socketIORouter(socket) {
    socket.on(config.actionEvent, (params, callback) => {
      const extension = router.extension;
      let promise = Promise.resolve();
      let request = { params };

      if (extension.has('preSocketIORequest')) {
        promise = promise.then(() => extension.exec('preSocketIORequest', socket, request))
      }

      return promise
        .then(() => {
          const actionName = params[config.requestActionKey];
          const routes = router.routes['socketIO'];

          return router.dispatcher(actionName, routes, request, callback);
        })
        .tap(() => {
          request = null;
        });
    });
  }
}

module.exports = getSocketIORouter;
