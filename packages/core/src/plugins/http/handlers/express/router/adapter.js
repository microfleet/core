// @flow
import type { $Response, $Request } from 'express';
import type { Router } from '../../../../router/factory';

const noop = require('lodash/noop');
const {
  AuthenticationRequiredError,
  ValidationError,
  NotPermittedError,
  NotFoundError,
} = require('common-errors');
const { ActionTransport } = require('../../../../../constants');
const { fromPathToName } = require('../../../helpers/actionName');

function getHTTPRouter(router: Router, config: Object) {
  return function HTTPRouter(request: $Request, response: $Response) {
    function callback(error, result) {
      if (error) {
        switch (error.constructor) {
          case AuthenticationRequiredError:
            response.status(401);
            break;
          case ValidationError:
            response.status(400);
            break;
          case NotPermittedError:
            response.status(403);
            break;
          case NotFoundError:
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

    const actionName = fromPathToName(request.path, config.prefix);

    return router.dispatch(actionName, {
      // input params
      params: request.body,
      query: request.query,
      headers: request.headers,
      locals: Object.create(null),
      method: (request.method.toLowerCase(): any),

      // transport options
      transport: ActionTransport.http,
      transportRequest: request,

      // ensure common proto
      action: noop,
      route: '',

      // opentracing
      parentSpan: undefined,
      span: undefined,

      // set to console
      log: (console: any),
    }, callback);
  };
}

module.exports = getHTTPRouter;
