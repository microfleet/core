"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _1 = require(".");
function storeRequestTimeFactory() {
    return {
        point: _1.LifecyclePoints.preRequest,
        async handler(route, request) {
            request.started = request.started || process.hrtime();
            return [route, request];
        },
    };
}
exports.storeRequestTimeFactory = storeRequestTimeFactory;
//# sourceMappingURL=sharedHandlers.js.map