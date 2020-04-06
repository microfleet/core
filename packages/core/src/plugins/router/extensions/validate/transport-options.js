"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Bluebird = require("bluebird");
const common_errors_1 = require("common-errors");
const __1 = require("..");
function postRequest(error, request) {
    const result = Bluebird.resolve([error, request]);
    if (error) {
        return result;
    }
    const { method, transport, action: { transportsOptions } } = request;
    if (transportsOptions === undefined) {
        return result;
    }
    const transportOptions = transportsOptions[transport];
    if (transportOptions === undefined) {
        return result;
    }
    if (!transportOptions.methods.includes(method)) {
        throw new common_errors_1.NotSupportedError(`Route ${request.route} method ${method}`);
    }
    return result;
}
exports.default = [{
        handler: postRequest,
        point: __1.LifecyclePoints.postRequest,
    }];
//# sourceMappingURL=transport-options.js.map