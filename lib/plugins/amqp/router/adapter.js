'use strict';

var _require = require('./../../../');

const ActionTransport = _require.ActionTransport;


function getAMQPRouterAdapter(router) {
  return function AMQPRouterAdapter(message, headers, actions, callback) {
    return router.dispatch(headers.routingKey, {
      params: message,
      transport: ActionTransport.amqp
    }, callback);
  };
}

module.exports = getAMQPRouterAdapter;