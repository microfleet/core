// @flow
import type { $Application } from 'express';
import typeof Mservice from '../../../../index';
import type { PluginInterface } from '../../../../types';

const Errors = require('common-errors');
const http = require('http');
const is = require('is');
const Promise = require('bluebird');
const attachRouter = require('./router/attach');
const _require = require('../../../../utils/require');

function createExpressServer(config: Object, service: Mservice): PluginInterface {
  const enableDestroy = _require('server-destroy');
  const express = _require('express');

  const handler: $Application = express();
  const server = http.createServer(handler);
  const properties = config.server.handlerConfig && config.server.handlerConfig.properties;

  if (is.object(properties)) {
    Object.keys(properties).forEach(key => handler.set(key, properties[key]));
  }

  if (config.router.enabled) {
    attachRouter(service, handler, config.router);
  }

  service._http = {
    handler,
    server,
  };

  function startServer() {
    if (service.http.server.listening === true) {
      return Promise.reject(new Errors.NotPermittedError('Http server was already started'));
    }

    if (config.server.attachSocketIO) {
      if (!service._socketIO) {
        return Promise.reject(new Errors.NotPermittedError('SocketIO plugin not found'));
      }

      service.socketIO.listen(service.http.server);
    }

    return Promise
      .fromCallback(callback =>
        service.http.server.listen(config.server.port, config.server.host, callback))
      .then(() => service.emit('plugin:start:http', service.http))
      .then(() => service.http);
  }

  function stopServer() {
    enableDestroy(service.http.server);

    if (config.server.attachSocketIO) {
      if (!service._socketIO) {
        return Promise.reject(new Errors.NotPermittedError('SocketIO plugin not found'));
      }

      service.socketIO.httpServer = null;
      service.socketIO.close();
    }

    return Promise
      .fromCallback(callback => service.http.server.destroy(callback))
      .then(() => service.emit('plugin:stop:http'));
  }

  return {
    connect: startServer,
    close: stopServer,
  };
}

module.exports = createExpressServer;
