const { ActionTransport } = require('./../../../');

function getAMQPRouterAdapter(router) {
  return function AMQPRouterAdapter(message, headers, actions, callback) {
    return router.dispatch(headers.routingKey, {
      params: message,
      transport: ActionTransport.amqp,
    }, callback);
  };
}

module.exports = getAMQPRouterAdapter;
