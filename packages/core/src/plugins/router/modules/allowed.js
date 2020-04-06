"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Bluebird = require("bluebird");
const constants_1 = require("../../../constants");
const common_errors_1 = require("common-errors");
const is = require("is");
const lifecycle_1 = require("./lifecycle");
function allowed(request) {
    return Bluebird
        .resolve(request)
        .bind(this)
        .then(request.action.allowed)
        .return(request)
        .catch((error) => {
        switch (error.constructor) {
            case common_errors_1.NotPermittedError:
            case common_errors_1.HttpStatusError:
                return Bluebird.reject(error);
            default:
                return Bluebird.reject(new common_errors_1.NotPermittedError(error));
        }
    });
}
function allowedHandler(request) {
    const allowedFn = is.undefined(request.action.allowed)
        ? constants_1.identity
        : allowed;
    return lifecycle_1.default('allowed', allowedFn, this.router.extensions, [request], this);
}
exports.default = allowedHandler;
//# sourceMappingURL=allowed.js.map