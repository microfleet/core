"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_errors_1 = require("common-errors");
const is = require("is");
/**
 * Verifies if it's possible to attach router for specific transport.
 * @param  router - Existing router instance.
 * @param  transportName - Transport name to attach handler to.
 */
function verifyAttachPossibility(router, transportName) {
    if (!is.object(router)) {
        throw new common_errors_1.NotFoundError('Module "router" not included');
    }
    const routesConfig = router.config.routes;
    if (!routesConfig.transports.includes(transportName)) {
        throw new common_errors_1.NotSupportedError(`${transportName} not in "router" module config`);
    }
}
exports.verifyAttachPossibility = verifyAttachPossibility;
//# sourceMappingURL=verifyAttachPossibility.js.map