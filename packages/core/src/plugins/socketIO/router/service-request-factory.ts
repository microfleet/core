import { ServiceRequest } from '../../../utils/service-request';
import { ActionTransport, ServiceRequestInterface } from '../../..';
import { SocketIOMessage } from './adapter';

export const createServiceRequest = (
  params: any,
  packet: SocketIOMessage,
  socket: NodeJS.EventEmitter
): ServiceRequestInterface => (
  new ServiceRequest(
    ActionTransport.socketIO,
    'socketio',
    Object.create(null),
    Object.create(null),
    params,
    packet,
    socket,
    undefined,
  )
);
