"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const is = require("is");
const __1 = require("..");
const sharedHandlers_1 = require("../sharedHandlers");
function auditLogFactory(params = {}) {
    const disableLogErrorsForNames = params.disableLogErrorsForNames || [];
    return [
        sharedHandlers_1.storeRequestTimeFactory(),
        {
            point: __1.LifecyclePoints.preResponse,
            async handler(error, result, request) {
                const execTime = request.executionTotal = process.hrtime(request.started);
                const meta = {
                    headers: request.headers,
                    latency: (execTime[0] * 1000) + (+(execTime[1] / 1000000).toFixed(3)),
                    method: request.method,
                    params: request.params,
                    query: request.query,
                    route: request.route,
                    transport: request.transport,
                    response: undefined,
                };
                if (error) {
                    const err = is.fn(error.toJSON) ? error.toJSON() : error.toString();
                    const isCodeLevelInfo = (error.statusCode && error.statusCode < 400)
                        || (error.name && disableLogErrorsForNames.includes(error.name));
                    const level = isCodeLevelInfo ? 'info' : 'error';
                    meta.err = error;
                    // just pass data through
                    request.log[level](meta, 'Error performing operation', err);
                }
                else {
                    if (this.config.debug) {
                        meta.response = result;
                    }
                    request.log.info(meta, 'completed operation', request.action.actionName);
                }
                return [error, result];
            },
        },
    ];
}
exports.default = auditLogFactory;
//# sourceMappingURL=log.js.map