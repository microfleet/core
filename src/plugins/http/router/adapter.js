const Errors = require('common-errors');

function getHTTPRouter(router) {
  return function HTTPRouter(request, response) {
    function callback(error, result) {
      if (error) {
        switch (error.constructor) {
          case Errors.AuthenticationRequiredError:
            response.status(401);
            break;
          case Errors.ValidationError:
            response.status(400);
            break;
          case Errors.NotPermittedError:
            response.status(403);
            break;
          case Errors.NotFoundError:
            response.status(404);
            break;
          default:
            response.status(500);
        }
      } else {
        response.status(200);
      }

      response.json(error || result);
    }

    const actionName = request.path.split('/').slice(1).join('.');
    const routes = router.routes.http;

    return router.dispatcher(actionName, routes, { params: request.body }, callback);
  };
}

module.exports = getHTTPRouter;
