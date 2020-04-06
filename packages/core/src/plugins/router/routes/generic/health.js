"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_errors_1 = require("common-errors");
const constants_1 = require("../../../../constants");
const __1 = require("../../../..");
const kUnhealthy = new common_errors_1.HttpStatusError(500, 'unhealthy');
async function genericHealthCheck(request) {
    const data = await this.getHealthStatus();
    if (constants_1.PLUGIN_STATUS_FAIL === data.status) {
        switch (request.transport) {
            case 'amqp':
            case 'internal': {
                const plugins = data.failed.map(it => it.name).join(', ');
                throw new common_errors_1.HttpStatusError(500, `Unhealthy due to following plugins: ${plugins}`);
            }
            default:
                throw kUnhealthy;
        }
    }
    return { data };
}
// to avoid 'setTransportAsDefault: false' and make things obvious
genericHealthCheck.transports = [
    __1.ActionTransport.http,
    __1.ActionTransport.amqp,
    __1.ActionTransport.internal,
    __1.ActionTransport.socketIO,
];
exports.default = genericHealthCheck;
//# sourceMappingURL=health.js.map