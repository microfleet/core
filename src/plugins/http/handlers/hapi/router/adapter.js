const { ActionTransport } = require('../../../../../');
const { fromPathToName } = require('../../../helpers/actionName');
const Errors = require('common-errors');
const is = require('is');
const _require = require('../../../../../utils/require');

module.exports = function getHapiAdapter(service, config) {
  const Boom = _require('boom');
  const router = service.router;

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

        const replyError = Boom.wrap(error, statusCode, errorMessage);

        if (error.name) {
          replyError.output.payload.name = error.name;
        }

        return reply(replyError);
      }

      return reply(null, result);
    }

    const actionName = fromPathToName(request.path, config.prefix);

    router.dispatch(actionName, {
      headers: request.headers,
      params: request.payload,
      query: request.query,
      method: request.method.toLowerCase(),
      transport: ActionTransport.http,
    }, callback);
  };
};
