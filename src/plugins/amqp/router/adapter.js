const { ActionTransport } = require('../../../');
const identity = require('lodash/identity');
const is = require('is');

function getAMQPRouterAdapter(router, config) {
  const onComplete = config.onComplete;
  const wrapDispatch = is.fn(onComplete)
    ? identity
    : (promise, actionName, actions) => promise.reflect()
      .then(fate => {
        const err = fate.isRejected() ? fate.reason() : null;
        const data = fate.isFulfilled() ? fate.value() : null;
        return [err, data, actionName, actions];
      })
      .spread(onComplete);

  return function AMQPRouterAdapter(message, headers, actions, next) {
    const actionName = headers.routingKey;
    const promise = wrapDispatch(router.dispatch(actionName, {
      params: message,
      transport: ActionTransport.amqp,
    }), actionName, actions);

    if (is.fn(next)) {
      return promise.asCallback(next);
    }

    return promise;
  };
}

module.exports = getAMQPRouterAdapter;
