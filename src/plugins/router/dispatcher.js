const Errors = require('common-errors');
const Promise = require('bluebird');

function dispatcher(route, routes, request, callback) {
  function response(error, result) {
    request = null;

    if (error) {
      switch (error.constructor) {
        case Errors.AuthenticationRequiredError:
        case Errors.ValidationError:
        case Errors.NotPermittedError:
        case Errors.NotFoundError:
          return callback(error);
        default:
          service.log.error(error);
          return callback(new Errors.Error('Something went wrong'));
      }
    }

    return callback(null, result);
  }

  const action = routes[route];

  if (action === undefined) {
    return Promise.reject(new Errors.NotFoundError(route)).asCallback(response);
  }

  const router = this;
  const service = router.service;
  request.route = route;

  return Promise
    .mapSeries(
      [
        router.modules.auth,
        router.modules.validate,
        router.modules.allowed,
      ],
      handler => handler(request, action, router)
    )
    .return(request)
    .bind(router)
    .then(action.handler)
    .asCallback(response);
}

module.exports = dispatcher;

