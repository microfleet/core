// @flow
import type { express$Request, express$Response } from 'express';
import type { Router } from '../../../../router/factory';

const { ActionTransport } = require('../../../../../constants');
const { fromPathToName } = require('../../../helpers/actionName');
const { AuthenticationRequiredError, ValidationError, NotPermittedError, NotFoundError } = require('common-errors');
const noop = require('lodash/noop');

function getHTTPRouter(router: Router, config: Object) {
  return function HTTPRouter(request: express$Request, response: express$Response) {
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
      method: request.method.toLowerCase(),
      // transport options
      transport: ActionTransport.http,
      transportRequest: request,
      // ensure common proto
      action: noop,
      route: '',
    }, callback);
  };
}

module.exports = getHTTPRouter;
