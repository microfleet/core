const Promise = require('bluebird');
const is = require('is');
const transport = require('../../../').ActionTransport.amqp;

function getAMQPRouterAdapter(router, config) {
  const onComplete = config.transport.onComplete;
  const wrapDispatch = is.fn(onComplete)
    ? (promise, actionName, actions) => promise.reflect()
      .then((fate) => {
        const err = fate.isRejected() ? fate.reason() : null;
        const data = fate.isFulfilled() ? fate.value() : null;
        return [err, data, actionName, actions];
      })
      .spread(onComplete)
    : promise => promise;

  // pre-wrap the function so that we do not need to actually do fromNode(next)
  const dispatch = Promise.promisify(router.dispatch, { context: router });

  return function AMQPRouterAdapter(params, headers, actions, next) {
    const actionName = headers.routingKey;
    const opts = {
      params,
      headers,
      query: {},
      // to provide similar interfaces
      transport,
      method: transport.toLowerCase(),
    };

    const promise = dispatch(actionName, opts);
    const wrappedDispatch = wrapDispatch(promise, actionName, actions);

    // promise or callback
    return is.fn(next) ? wrappedDispatch.asCallback(next) : wrappedDispatch;
  };
}

module.exports = getAMQPRouterAdapter;
