// @flow
import type EventEmitter from 'events';
import type { ServiceRequest } from '../../../types';
import type { Router } from '../../router/factory';

const { ActionTransport } = require('../../../constants');
const Promise = require('bluebird');
const noop = require('lodash/noop');
const debug = require('debug')('mservice:router:socket.io');

const { socketIO } = ActionTransport;

export type SocketIOMessage = {
  data: [string, mixed, ?() => mixed],
};

function getSocketIORouterAdapter(config: Object, router: Router) {
  return function socketIORouterAdapter(socket: EventEmitter) {
    socket.on('*', (packet: SocketIOMessage) => {
      const [actionName, params, callback] = packet.data;
      const request: ServiceRequest = {
        params,
        query: {},
        headers: {},
        socket,

        // default method to the transport for similar interfaces
        method: 'socketio',
        transport: socketIO,
        transportRequest: packet,

        // init proto of obj
        action: noop,
        route: '',

        // opentracing
        parentSpan: undefined,
        span: undefined,
      };

      debug('prepared request with', packet.data);

      return Promise
        .bind(router, [actionName, request, callback])
        .spread(router.dispatch);
    });
  };
}

module.exports = getSocketIORouterAdapter;
