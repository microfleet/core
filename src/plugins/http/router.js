function getHTTPRouter(router) {
  return function HTTPRouter(request, response) {
    const callback = function(error, result) {
      response.send(error || result);
    };
    const actionName = request.path.split('/').slice(1).join('.');
    const routes = router.routes['http'];

    return router.dispatcher(actionName, routes, { params: request.query }, callback);
  }
}

module.exports = getHTTPRouter;
