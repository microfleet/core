"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_errors_1 = require("common-errors");
exports.ERROR_NOT_STARTED = new common_errors_1.NotPermittedError('redis was not started');
exports.ERROR_NOT_HEALTHY = new common_errors_1.ConnectionError('redis connection is not healthy');
exports.ERROR_ALREADY_STARTED = new common_errors_1.NotPermittedError('redis was already started');
//# sourceMappingURL=constants.js.map