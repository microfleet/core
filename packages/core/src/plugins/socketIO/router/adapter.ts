import _debug = require('debug');
import noop = require('lodash/noop');
import { ActionTransport } from '../../..';
import { IServiceRequest } from '../../../types';
import { IMicrofleetRouter } from '../../router/factory';

const debug = _debug('mservice:router:socket.io');
const { socketIO } = ActionTransport;

export interface ISocketIOMessage {
  data: [string, any, () => any | null];
}

function getSocketIORouterAdapter(_: any, router: IMicrofleetRouter) {
  return function socketIORouterAdapter(socket: NodeJS.EventEmitter) {
    socket.on('*', (packet: ISocketIOMessage) => {
      const [actionName, params, callback] = packet.data;
      const request: IServiceRequest = {
        action: noop as any,
        headers: Object.create(null),
        locals: Object.create(null),
        log: console as any,
        method: 'socketio',
        params,
        parentSpan: undefined,
        query: Object.create(null),
        route: '',
        socket,
        span: undefined,
        transport: socketIO,
        transportRequest: packet,
      };

      debug('prepared request with', packet.data);

      return router.dispatch.call(router, actionName, request, callback);
    });
  };
}

export default getSocketIORouterAdapter;
