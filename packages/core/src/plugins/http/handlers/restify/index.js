// @flow
import typeof Mservice from '../../../../index';

const Errors = require('common-errors');
const Promise = require('bluebird');
const _require = require('../../../../utils/require');

function createRestifyServer(config: Object, service: Mservice): PluginInterface {
  const restify = _require('restify');
  const enableDestroy = _require('server-destroy');

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

      service.socketIO.listen(service.http, service.config.socketIO.options);
    }

    return Promise
      .fromCallback(callback => (
        service.http.server.listen(config.server.port, config.server.host, callback)
      ))
      .then(() => service.emit('plugin:start:http', service.http))
      .then(() => {
        const { http } = service;
        http.closeAsync = Promise.promisify(http.close, { context: http });
        http.destroyAsync = Promise.promisify(http.destroy, { context: http });
        return http;
      });
  }

  function stopServer() {
    if (config.server.attachSocketIO) {
      if (!service._socketIO) {
        return Promise.reject(new Errors.NotPermittedError('SocketIO plugin not found'));
      }

      service.socketIO.httpServer = null;
      service.socketIO.close();
    }

    return service.http
      .closeAsync()
      .timeout(5000)
      .catch(Promise.TimeoutError, () => service.http.destroyAsync())
      .then(() => service.emit('plugin:stop:http'));
  }

  return {
    connect: startServer,
    close: stopServer,
  };
}

module.exports = createRestifyServer;
