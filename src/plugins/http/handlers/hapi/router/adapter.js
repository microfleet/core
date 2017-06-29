// @flow
import type { IncomingMessage } from 'http';
import typeof Mservice from '../../../../../index';
import type { ServiceRequest } from '../../../../../types';

const { FORMAT_HTTP_HEADERS } = require('opentracing');
const { ActionTransport } = require('../../../../../constants');
const { fromPathToName } = require('../../../helpers/actionName');
const Errors = require('common-errors');
const is = require('is');
const noop = require('lodash/noop');
const _require = require('../../../../../utils/require');
const Response = require('hapi/lib/response');

export type HapiIncomingMessage = IncomingMessage & {
  path: string,
  payload: Object,
  query: Object,
  method: 'PUT' | 'DELETE' | 'GET' | 'POST' | 'PATCH' | 'HEAD',
};

module.exports = function getHapiAdapter(service: Mservice, config: Object) {
  const Boom = _require('boom');
  const router = service.router;

  const reformatError = (error) => {
    let statusCode;
    let errorMessage;

    const { errors } = error;

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
      case Errors.HttpStatusError:
        statusCode = error.statusCode;
        break;
      default:
        statusCode = 500;
    }

    if (is.array(errors) && errors.length) {
      const [nestedError] = errors;
      errorMessage = nestedError.text || nestedError.message || undefined;
    }

    const replyError = Boom.wrap(error, statusCode, errorMessage);

    if (error.name) {
      replyError.output.payload.name = error.name;
    }

    return replyError;
  };

  return function handler(request: HapiIncomingMessage, reply: (error: ?Error, result: mixed) => void) {
    const actionName = fromPathToName(request.path, config.prefix);
    const headers = request.headers;

    let parentSpan;
    if (service._tracer !== undefined) {
      parentSpan = service._tracer.extract(headers, FORMAT_HTTP_HEADERS);
    }

    const serviceRequest: ServiceRequest = {
      headers,
      params: request.payload,
      query: request.query,
      method: request.method.toLowerCase(),

      // transport type
      transport: ActionTransport.http,
      transportRequest: request,

      // defaults for consistent object map
      action: noop,
      route: '',

      // opentracing
      parentSpan,
      span: undefined,
    };

    router.dispatch(actionName, serviceRequest, (error, result) => {
      if (error) {
        return reply(reformatError(error));
      }

      if (result instanceof Response) {
        return reply(result);
      }

      return reply(null, result);
    });
  };
};
