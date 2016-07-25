'use strict';

const Promise = require('bluebird');

function getSocketIORouter(config, router) {
  return function socketIORouter(socket) {
    socket.on(config.actionEvent, (params, callback) => {
      const extension = router.extensions;
      let promise;
      let request = { params };

      if (extension.has('preSocketIORequest')) {
        promise = promise.then(() => extension.exec('preSocketIORequest', socket, request));
      } else {
        promise = Promise.resolve();
      }

      return promise.tap(() => {
        const actionName = params[config.requestActionKey];
        const routes = router.routes.socketIO;

        return router.dispatcher(actionName, routes, request, callback);
      }).asCallback(() => {
        request = null;
      });
    });
  };
}

module.exports = getSocketIORouter;