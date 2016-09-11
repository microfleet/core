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

  return function AMQPRouterAdapter(params, headers, actions, next) {
    const actionName = headers.routingKey;

    // TODO: response module is not correctly called, callback is always needed
    const promise = Promise.fromNode((callback) => {
      router.dispatch(actionName, { params, transport }, callback);
    });

    const wrappedDispatch = wrapDispatch(promise, actionName, actions);

    // promise or callback
    return is.fn(next) ? wrappedDispatch.asCallback(next) : wrappedDispatch;
  };
}

module.exports = getAMQPRouterAdapter;
