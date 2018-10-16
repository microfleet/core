// @flow
import type EventEmitter from 'events';
import type { Router } from '../../router/factory';

const Promise = require('bluebird');
const noop = require('lodash/noop');
const debug = require('debug')('mservice:router:socket.io');
const { ActionTransport } = require('../../../constants');

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
        query: Object.create(null),
        headers: Object.create(null),
        locals: Object.create(null),
        socket,

        // default method to the transport for similar interfaces
        method: 'socketio',
        transport: socketIO,
        transportRequest: packet,

        // init proto of obj
        action: noop,
        route: '',

        // NOTE: not supported, opentracing parent span won't be defined here
        parentSpan: undefined,
        span: undefined,

        // set to console
        log: (console: any),
      };

      debug('prepared request with', packet.data);

      // $FlowFixMe
      return Promise
        .bind(router, [actionName, request, callback])
        .spread(router.dispatch);
    });
  };
}

module.exports = getSocketIORouterAdapter;
