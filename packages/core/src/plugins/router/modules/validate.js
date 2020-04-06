"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const validation_1 = require("@microfleet/validation");
const common_errors_1 = require("common-errors");
const is = require("is");
const constants_1 = require("../../../constants");
const lifecycle_1 = require("./lifecycle");
async function validate(request) {
    const { validator } = this;
    const paramsKey = constants_1.DATA_KEY_SELECTOR[request.method];
    try {
        const validationResult = await validator.validate(request.action.schema, request[paramsKey]);
        request[paramsKey] = validationResult;
        return request;
    }
    catch (error) {
        if (error.constructor === validation_1.HttpStatusError) {
            throw error;
        }
        throw new common_errors_1.Error('internal validation error', error);
    }
}
function passThrough(request) {
    return request;
}
function validateHandler(request) {
    const validateFn = is.undefined(request.action.schema)
        ? passThrough
        : validate;
    return lifecycle_1.default('validate', validateFn, this.router.extensions, [request], this);
}
exports.default = validateHandler;
//# sourceMappingURL=validate.js.map