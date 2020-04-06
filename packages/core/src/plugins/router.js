"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const rfdc = require("rfdc");
const common_errors_1 = require("common-errors");
const constants_1 = require("../constants");
const factory_1 = require("./router/factory");
const is_1 = require("is");
const { internal } = constants_1.ActionTransport;
/**
 * Plugin Name
 */
exports.name = 'router';
/**
 * Plugin Type
 */
exports.type = constants_1.PluginTypes.essential;
/**
 * Relative priority inside the same plugin group type
 */
exports.priority = 100;
/**
 * Shallow copies object, pass-through everything else
 */
const shallowObjectClone = (prop) => is_1.object(prop)
    ? Object.assign(Object.create(null), prop)
    : prop;
/**
 * Allows to deep clone object
 */
const deepClone = rfdc();
/**
 * Fills gaps in default service request.
 * @param request - service request.
 * @returns Prepared service request.
 */
const prepareRequest = (request) => ({
    // initiate action to ensure that we have prepared proto fo the object
    // input params
    // make sure we standardize the request
    // to provide similar interfaces
    action: null,
    headers: shallowObjectClone(request.headers),
    locals: shallowObjectClone(request.locals),
    auth: shallowObjectClone(request.auth),
    log: console,
    method: internal,
    params: request.params != null
        ? deepClone(request.params)
        : Object.create(null),
    parentSpan: undefined,
    query: Object.create(null),
    route: '',
    span: undefined,
    transport: internal,
    transportRequest: Object.create(null),
});
/**
 * Enables router plugin.
 * @param opts - Router configuration object.
 */
function attach(opts) {
    assert(this.hasPlugin('logger'), new common_errors_1.NotFoundError('log module must be included'));
    assert(this.hasPlugin('validator'), new common_errors_1.NotFoundError('validator module must be included'));
    const config = this.validator.ifError('router', opts);
    for (const transport of config.routes.transports) {
        if (!this.config.plugins.includes(transport) && transport !== internal) {
            throw new common_errors_1.NotSupportedError(`transport ${transport}`);
        }
    }
    const router = this.router = factory_1.getRouter(config, this);
    const { prefix } = config.routes;
    const assemble = prefix
        ? (route) => `${prefix}.${route}`
        : constants_1.identity;
    // dispatcher
    this.dispatch = (route, request) => {
        const msg = prepareRequest(request);
        return router.dispatch(assemble(route), msg);
    };
}
exports.attach = attach;
//# sourceMappingURL=router.js.map