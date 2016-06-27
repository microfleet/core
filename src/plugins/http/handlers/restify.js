const enableDestroy = require('server-destroy');
const Errors = require('common-errors');
const Promise = require('bluebird');
const restify = require('restify');

function createRestifyServer(config, service) {
  const restifyConfig = config.server.handlerConfig || {};
  restifyConfig.socketio = true; // prevent handle socket.io requests, see restify server
  service._http = restify.createServer(restifyConfig);

  // make sure we can destroy it
  enableDestroy(service._http.server);

  function startServer() {
    if (service.http.server.listening === true) {
      return Promise.reject(new Errors.NotPermittedError('Http server was already started'));
    }

    if (config.server.attachSocketIO) {
      if (!service._socketio) {
        return Promise.reject(new Errors.NotPermittedError('SocketIO plugin not found'));
      }

      service.socketio.listen(service.http);
    }

    return Promise
      .fromCallback(callback =>
        service.http.server.listen(config.server.port, config.server.host, callback))
      .then(() => service.emit('plugin:start:http', service.http))
      .then(() => service.http);
  }

  function stopServer() {
    if (config.server.attachSocketIO) {
      if (!service._socketio) {
        return Promise.reject(new Errors.NotPermittedError('SocketIO plugin not found'));
      }

      service.socketio.httpServer = null;
      service.socketio.close();
    }

    return Promise
      .fromCallback(next => service.http.server.close(next))
      .timeout(5000)
      .catch(Promise.TimeoutError, () => Promise.fromCallback(next =>
        service.http.server.destroy(next)
      ))
      .then(() => service.emit('plugin:stop:http'));
  }

  return {
    connect: startServer,
    close: stopServer,
  };
}

module.exports = createRestifyServer;
