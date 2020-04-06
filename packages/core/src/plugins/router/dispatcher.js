"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Bluebird = require("bluebird");
const _debug = require("debug");
const is = require("is");
const opentracing_1 = require("opentracing");
const uuid = require("uuid");
const debug = _debug('mservice:router:dispatch');
const { ERROR, COMPONENT } = opentracing_1.Tags;
const wrapPromise = (span, promise, callback) => (promise
    .catch((err) => {
    span.setTag(ERROR, true);
    span.log({
        'error.object': err,
        event: 'error',
        message: err.message,
        stack: err.stack,
    });
    throw err;
})
    .finally(() => {
    span.finish();
})
    .asCallback(callback));
function reflectToProps(reflection) {
    return reflection.isRejected()
        ? [reflection.reason(), undefined, this]
        : [null, reflection.value(), this];
}
function dispatch(route, request, callback) {
    const { modules, service } = this;
    debug('initiating request on route %s', route);
    // if we have installed tracer - init span
    let span;
    if (service.tracer !== undefined) {
        span = request.span = service.tracer.startSpan(`dispatch:${route}`, {
            childOf: request.parentSpan,
            tags: {
                [COMPONENT]: request.transport,
            },
        });
    }
    request.log = service.log.child({
        reqId: uuid.v4(),
    });
    let result = Bluebird
        .resolve([route, request])
        .bind(service)
        .spread(modules.request)
        .then(modules.auth)
        .then(modules.validate)
        .then(modules.allowed)
        .then(modules.handler);
    if (is.fn(callback)) {
        result = result
            .reflect() // <-- reflect promise
            .bind(request) // <-- bind to request
            .then(reflectToProps) // <-- process data
            .bind(service) // <-- bind back to service
            .then(modules.response);
    }
    return span !== undefined
        ? wrapPromise(span, result, callback)
        : result.asCallback(callback);
}
exports.default = dispatch;
//# sourceMappingURL=dispatcher.js.map