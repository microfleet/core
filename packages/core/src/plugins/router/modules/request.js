"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Bluebird = require("bluebird");
const common_errors_1 = require("common-errors");
const _debug = require("debug");
const is = require("is");
const lifecycle_1 = require("./lifecycle");
const debug = _debug('mservice:router:module:request');
function getAction(route, request) {
    debug('handler for module "request"');
    const { transport } = request;
    if (is.undefined(transport)) {
        return Bluebird.reject(new common_errors_1.ArgumentError('"request" must have property "transport"'));
    }
    const action = this.router.routes[transport][route];
    if (!is.fn(action)) {
        return Bluebird.reject(new common_errors_1.NotFoundError(`route "${route}" not found`));
    }
    request.action = action;
    request.route = route;
    const { maintenanceMode } = this.config;
    if (maintenanceMode && !action.readonly) {
        return Bluebird.reject(new common_errors_1.HttpStatusError(418, 'Server Maintenance'));
    }
    return request;
}
function requestHandler(route, request) {
    const { extensions } = this.router;
    return lifecycle_1.default('request', getAction, extensions, [route, request], this);
}
exports.default = requestHandler;
//# sourceMappingURL=request.js.map