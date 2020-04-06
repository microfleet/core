"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const get = require("get-value");
const defaults = require("lodash/defaults");
const omit = require("lodash/omit");
const __1 = require("../../../../..");
const verifyAttachPossibility_1 = require("../../../../router/verifyAttachPossibility");
const actionName_1 = require("../../../helpers/actionName");
const adapter_1 = require("./adapter");
function attachRequestCountEvents(server, router) {
    const { http } = __1.ActionTransport;
    const { requestCountTracker } = router;
    /* Hapi not emitting request event */
    /* Using Extension */
    const onRequest = (_, h) => {
        requestCountTracker.increase(http);
        return h.continue;
    };
    /* But emit's 'response' event */
    const onResponse = () => {
        requestCountTracker.decrease(http);
    };
    const onStop = () => {
        server.events.removeListener('response', onResponse);
    };
    server.ext('onRequest', onRequest);
    server.events.on('response', onResponse);
    server.events.on('stop', onStop);
}
function attachRouter(service, config) {
    verifyAttachPossibility_1.verifyAttachPossibility(service.router, __1.ActionTransport.http);
    return {
        plugin: {
            name: 'microfleetRouter',
            version: '1.0.0',
            async register(server) {
                for (const [actionName, handler] of Object.entries(service.router.routes.http)) {
                    const path = actionName_1.fromNameToPath(actionName, config.prefix);
                    const defaultOptions = {
                        path,
                        handler: adapter_1.default(actionName, service),
                        method: ['GET', 'POST'],
                    };
                    const hapiTransportOptions = get(handler, 'transportOptions.handlers.hapi', Object.create(null));
                    const handlerOptions = omit(hapiTransportOptions, ['path', 'handler']);
                    server.route(defaults(handlerOptions, defaultOptions));
                }
                server.route({
                    method: ['GET', 'POST'],
                    path: '/{any*}',
                    async handler(request) {
                        const actionName = actionName_1.fromPathToName(request.path, config.prefix);
                        const handler = adapter_1.default(actionName, service);
                        return handler(request);
                    },
                });
                attachRequestCountEvents(server, service.router);
            },
        },
    };
}
exports.default = attachRouter;
//# sourceMappingURL=attach.js.map