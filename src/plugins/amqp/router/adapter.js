function getAmqpRouterAdapter(router) {
  const routes = router.routes.amqp;

  return function amqpRouterAdapter(message, headers, actions, callback) {
    return router.dispatcher(headers.routingKey, routes, { params: message }, callback);
  };
}

module.exports = getAmqpRouterAdapter;
