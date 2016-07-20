const debug = require('debug')('mservice:router:dispatcher');
const Errors = require('common-errors');
const Promise = require('bluebird');

function dispatcher(route, routes, request, callback) {
  debug('process route "%s" with request "%s"', route, JSON.stringify(request));
  const router = this;

  return Promise
    .resolve([route, routes, request, router])
    .bind(router)
    .spread(router.modules.request)
    .then(action => Promise.mapSeries(
      [
        router.modules.auth,
        router.modules.validate,
        router.modules.allowed,
        router.modules.handler,
      ],
      handler => handler(request, action, router)
    ))
    .spread((authResult, validateResult, allowedResult, handlerResult) => handlerResult)
    .asCallback((error, result) => {
      const service = router.service;
      request = null; // eslint-disable-line no-param-reassign

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
    });
}

module.exports = dispatcher;
