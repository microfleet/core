"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _debug = require("debug");
const noop = require("lodash/noop");
const __1 = require("../../..");
const debug = _debug('mservice:router:socket.io');
const { socketIO } = __1.ActionTransport;
/* Decrease request count on response */
function wrapCallback(router, callback) {
    return (err, result) => {
        router.requestCountTracker.decrease(socketIO);
        if (callback) {
            callback(err, result);
        }
    };
}
function getSocketIORouterAdapter(_, router) {
    return function socketIORouterAdapter(socket) {
        socket.on('*', (packet) => {
            /* Increase request count on message */
            router.requestCountTracker.increase(socketIO);
            const [actionName, params, callback] = packet.data;
            const request = {
                socket,
                params,
                action: noop,
                headers: Object.create(null),
                locals: Object.create(null),
                log: console,
                method: 'socketio',
                parentSpan: undefined,
                query: Object.create(null),
                route: '',
                span: undefined,
                transport: socketIO,
                transportRequest: packet,
            };
            debug('prepared request with', packet.data);
            const wrappedCallback = wrapCallback(router, callback);
            router.dispatch.call(router, actionName, request, wrappedCallback);
        });
    };
}
exports.default = getSocketIORouterAdapter;
//# sourceMappingURL=adapter.js.map