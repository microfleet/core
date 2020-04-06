"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Bluebird = require("bluebird");
const get = require("get-value");
const is = require("is");
const noop = require("lodash/noop");
const __1 = require("../../..");
// cached var
const { amqp } = __1.ActionTransport;
function getAMQPRouterAdapter(router, config) {
    const { onComplete } = config.transport;
    const { service, requestCountTracker } = router;
    const wrapDispatch = is.fn(onComplete)
        ? (promise, actionName, raw) => promise
            .reflect()
            .then((fate) => {
            const err = fate.isRejected() ? fate.reason() : null;
            const data = fate.isFulfilled() ? fate.value() : null;
            return onComplete.call(service, err, data, actionName, raw);
        })
        : (promise) => promise;
    const decreaseCounter = () => requestCountTracker.decrease(amqp);
    const increaseCounter = () => requestCountTracker.increase(amqp);
    // pre-wrap the function so that we do not need to actually do fromNode(next)
    const dispatch = Bluebird.promisify(router.dispatch, { context: router });
    const prefix = get(config, 'router.prefix', '');
    const prefixLength = prefix ? prefix.length + 1 : 0;
    const normalizeActionName = prefixLength > 0
        ? (routingKey) => (routingKey.startsWith(prefix)
            ? routingKey.substr(prefixLength)
            : routingKey)
        : (routingKey) => routingKey;
    return async (params, properties, raw, next = noop) => {
        const routingKey = properties.headers['routing-key'] || properties.routingKey;
        const actionName = normalizeActionName(routingKey);
        const opts = {
            // initiate action to ensure that we have prepared proto fo the object
            // input params
            // make sure we standardize the request
            // to provide similar interfaces
            params,
            action: noop,
            headers: properties,
            locals: Object.create(null),
            log: console,
            method: amqp,
            parentSpan: raw.span,
            query: Object.create(null),
            route: '',
            span: undefined,
            transport: amqp,
            transportRequest: Object.create(null),
        };
        increaseCounter();
        try {
            const promise = dispatch(actionName, opts);
            const response = await wrapDispatch(promise, actionName, raw);
            setImmediate(next, null, response);
        }
        catch (e) {
            setImmediate(next, e);
        }
        setImmediate(decreaseCounter);
    };
}
exports.default = getAMQPRouterAdapter;
//# sourceMappingURL=adapter.js.map