"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require("../../..");
const verifyAttachPossibility_1 = require("../../router/verifyAttachPossibility");
const adapter_1 = require("./adapter");
const wildcard = require("socketio-wildcard");
function attachSocketIORouter(socketIO, config, router) {
    verifyAttachPossibility_1.verifyAttachPossibility(router, __1.ActionTransport.socketIO);
    // include adapter
    const wildcardMiddleware = wildcard();
    // due to changes in socket.io@2.0.2 we must attach server before using .use for adding middleware
    // otherwise it crashes
    const { attach } = socketIO;
    // NOTE: overwrites listen & attach functions so that we can init middleware after we have connected
    // a server to socket.io instance
    socketIO.attach = socketIO.listen = function listen(...args) {
        attach.apply(this, args);
        socketIO.use(wildcardMiddleware);
    };
    socketIO.on('connection', adapter_1.default(config, router));
}
exports.default = attachSocketIORouter;
//# sourceMappingURL=attach.js.map