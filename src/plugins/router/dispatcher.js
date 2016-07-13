const Errors = require('common-errors');
const is = require('is');
const Promise = require('bluebird');

function dispatcher(route, routes, request, callback, service) {
  function response(error, result)  {
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

  const validator = service.validator;
  const router = service.router;
  const { allowed, auth, handler, validate } = action;
  const promise = Promise.bind(service).return(request);


  return promise
    .then(req => {
      if (auth !== null) {
        return router
          .auth(auth, req.params)
          .then(credentials => {
            req.auth = { credentials };
            return req;
          })
          .catch(error => {
            return Promise.reject(new Errors.AuthenticationRequired(error));
          });
      }

      return req;
    })
    .then(req => {
      if (validate !== null) {
        return validator.validate(route, req.params)
          .then(sanitizedParams => {
            req.params = sanitizedParams;
            return req;
          });
      }

      return req;
    })
    .then(req => {
      if (allowed !== null) {
        return allowed(req)
          .then(() => req);
      }

      return req;
    })
    .then(handler)
    .asCallback(response);
}

module.exports = dispatcher;

