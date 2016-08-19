const { ActionTransport } = require('../../../');
const is = require('is');

function getAMQPRouterAdapter(router, config) {
  const onComplete = config.transport.onComplete;
  const wrapDispatch = is.fn(onComplete)
    ? (promise, actionName, actions) => promise.reflect()
      .then(fate => {
        const err = fate.isRejected() ? fate.reason() : null;
        const data = fate.isFulfilled() ? fate.value() : null;
        return [err, data, actionName, actions];
      })
      .spread(onComplete)
    : (promise) => promise;

  return function AMQPRouterAdapter(message, headers, actions, next) {
    const actionName = headers.routingKey;
    const promise = router.dispatch(actionName, {
      params: message,
      transport: ActionTransport.amqp,
    });
    const wrappedDispatch = wrapDispatch(promise, actionName, actions);
    return is.fn(next) ? wrappedDispatch.asCallback(next) : wrappedDispatch;
  };
}

module.exports = getAMQPRouterAdapter;
