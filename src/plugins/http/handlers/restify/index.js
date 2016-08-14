const Errors = require('common-errors');
const Promise = require('bluebird');

function createRestifyServer(config, service) {
  const restify = service._require('restify');
  const enableDestroy = service._require('server-destroy');

  const restifyConfig = config.server.handlerConfig || {};
  restifyConfig.socketio = true; // prevent handle socket.io requests, see restify server
  service._http = restify.createServer(restifyConfig);

  // make sure we can destroy it
  enableDestroy(service.http);

  function startServer() {
    if (service.http.server.listening === true) {
      return Promise.reject(new Errors.NotPermittedError('Http server was already started'));
    }

    if (config.server.attachSocketIO) {
      if (!service._socketIO) {
        return Promise.reject(new Errors.NotPermittedError('SocketIO plugin not found'));
      }

      service.socketIO.listen(service.http);
    }

    return Promise
      .fromCallback(callback =>
        service.http.server.listen(config.server.port, config.server.host, callback))
      .then(() => service.emit('plugin:start:http', service.http))
      .then(() => service.http);
  }

  function stopServer() {
    if (config.server.attachSocketIO) {
      if (!service._socketIO) {
        return Promise.reject(new Errors.NotPermittedError('SocketIO plugin not found'));
      }

      service.socketIO.httpServer = null;
      service.socketIO.close();
    }

    return Promise
      .fromCallback(next => service.http.close(next))
      .timeout(5000)
      .catch(Promise.TimeoutError, () => Promise.fromCallback(next =>
        service.http.destroy(next)
      ))
      .then(() => service.emit('plugin:stop:http'));
  }

  return {
    connect: startServer,
    close: stopServer,
  };
}

module.exports = createRestifyServer;
