"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dispatcher_1 = require("./dispatcher");
const extensions_1 = require("./extensions");
exports.LifecyclePoints = extensions_1.LifecyclePoints;
const allowed_1 = require("./modules/allowed");
const auth_1 = require("./modules/auth");
const handler_1 = require("./modules/handler");
const request_1 = require("./modules/request");
const response_1 = require("./modules/response");
const validate_1 = require("./modules/validate");
const routes_1 = require("./routes");
const request_tracker_1 = require("./request-tracker");
/**
 * Initializes router.
 * @param config - Router configuration object.
 * @param config.auth - Auth module configuration object.
 * @param config.extensions - Extensions configuration object.
 * @param config.routes - Routes configuration object.
 * @param service - Microfleet instance.
 * @returns Router instance.
 */
function getRouter(config, service) {
    const router = {
        config,
        service,
        dispatch: dispatcher_1.default,
        requestCountTracker: new request_tracker_1.RequestCountTracker(service),
        extensions: new extensions_1.default(config.extensions),
        modules: {
            allowed: allowed_1.default,
            auth: auth_1.default(config.auth),
            handler: handler_1.default,
            request: request_1.default,
            response: response_1.default,
            validate: validate_1.default,
        },
        routes: routes_1.getRoutes.call(service, config.routes),
    };
    return router;
}
exports.getRouter = getRouter;
//# sourceMappingURL=factory.js.map