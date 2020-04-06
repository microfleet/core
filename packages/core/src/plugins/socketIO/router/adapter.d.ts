/// <reference types="node" />
import { Router } from '../../router/factory';
import { RequestCallback } from '../../router/dispatcher';
export interface SocketIOMessage {
    data: [string, any, RequestCallback];
}
declare function getSocketIORouterAdapter(_: any, router: Router): (socket: NodeJS.EventEmitter) => void;
export default getSocketIORouterAdapter;
