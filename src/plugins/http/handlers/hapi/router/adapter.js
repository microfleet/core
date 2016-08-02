const { ActionTransport } = require('./../../../../../');
const Boom = require('boom');
const Errors = require('common-errors');
const is = require('is');

module.exports = function getHapiAdapter(router) {
  return function handler(request, reply) {
    function callback(error, result) {
      if (error) {
        let statusCode;
        let errorMessage;
        const { message, errors } = error;

        switch (error.constructor) {
          case Errors.AuthenticationRequiredError:
            statusCode = 401;
            break;
          case Errors.ValidationError:
            statusCode = 400;
            break;
          case Errors.NotPermittedError:
            statusCode = 403;
            break;
          case Errors.NotFoundError:
            statusCode = 404;
            break;
          default:
            statusCode = 500;
        }

        if (is.array(errors) && errors.length) {
          errorMessage = errors[0].text;
        } else {
          errorMessage = message;
        }

        return reply(Boom.wrap(error, statusCode, errorMessage));
      }

      return reply(null, result);
    }

    const actionName = request.path.split('/').slice(1).join('.');
    router.dispatch(actionName, {
      params: request.payload,
      transport: ActionTransport.http,
    }, callback);
  };
};
