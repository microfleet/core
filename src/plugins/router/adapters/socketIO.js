const router = require('../router');

module.exports = function getSocketIORouter(service) {
  return function socketIORouter(socket) {
    // @todo get 'action' from config
    socket.on('action', (params, callback) => {
      // @todo validate 'params.action'
      return router(params.action, { params }, callback, service);
    });
  }
};
