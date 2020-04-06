"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const common_errors_1 = require("common-errors");
const _debug = require("debug");
const is = require("is");
const __1 = require("../");
const require_1 = require("../utils/require");
const attach_1 = require("./socketIO/router/attach");
const RequestTracker = require("./router/request-tracker");
const debug = _debug('mservice:socketIO');
function attachSocketIO(opts = {}) {
    debug('Attaching socketIO plugin');
    const AdapterFactory = require_1.default('ms-socket.io-adapter-amqp');
    const SocketIO = require_1.default('socket.io');
    assert(this.hasPlugin('validator'), new common_errors_1.NotFoundError('validator module must be included'));
    const adapters = {
        amqp: (adapterOptions) => AdapterFactory.fromOptions(adapterOptions),
    };
    const config = this.validator.ifError('socketIO', opts);
    const { options, router } = config;
    const { adapter } = options;
    if (is.object(adapter)) {
        if (adapters[adapter.name] === undefined) {
            throw new common_errors_1.NotImplementedError(`Adapter ${adapter.name} is not implemented`);
        }
        options.adapter = adapters[adapter.name](adapter.options);
    }
    const socketIO = SocketIO(options);
    if (router.enabled) {
        attach_1.default(socketIO, router, this.router);
    }
    this.socketIO = socketIO;
    return {
        getRequestCount: RequestTracker.getRequestCount.bind(undefined, this, __1.ActionTransport.socketIO),
    };
}
/**
 * Relative priority inside the same plugin group type
 */
exports.priority = 100;
exports.attach = attachSocketIO;
exports.name = 'socketIO';
exports.type = __1.PluginTypes.transport;
//# sourceMappingURL=socketIO.js.map