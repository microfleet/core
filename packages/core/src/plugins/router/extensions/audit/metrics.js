"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require("..");
const sharedHandlers_1 = require("../sharedHandlers");
function extractStatusCode(error) {
    if (!error) {
        return 200;
    }
    switch (error.name) {
        case 'AuthenticationRequiredError':
            return 400;
        case 'ValidationError':
            return 401;
        case 'NotPermittedError':
            return 403;
        case 'NotFoundError':
            return 404;
        case 'NotSupportedError':
            return 405;
        default:
            return error.statusCode || 500;
    }
}
function diff(start) {
    const execTime = process.hrtime(start);
    const ms = (execTime[0] * 1000) + (+(execTime[1] / 1000000));
    return parseInt(ms.toFixed(), 10);
}
function metricObservabilityFactory() {
    return [
        sharedHandlers_1.storeRequestTimeFactory(),
        {
            point: __1.LifecyclePoints.postResponse,
            async handler(e, r, _, __, request) {
                const { metricMicrofleetDuration } = this;
                const latency = diff(request.started);
                const labels = {
                    method: request.method,
                    // NOTE: route empty in case of 404 - should we extract real path from the `transportRequest` ?
                    route: request.route,
                    transport: request.transport,
                    statusCode: extractStatusCode(e),
                };
                metricMicrofleetDuration.observe(labels, latency);
                return [e, r];
            },
        },
    ];
}
exports.default = metricObservabilityFactory;
//# sourceMappingURL=metrics.js.map