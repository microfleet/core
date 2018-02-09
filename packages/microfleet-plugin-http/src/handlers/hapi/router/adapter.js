// @flow
import type { IncomingMessage } from 'http';
import typeof Mservice from '@microfleet/core';

const Promise = require('bluebird');
const { FORMAT_HTTP_HEADERS } = require('opentracing');
const { ActionTransport } = require('@microfleet/config').constants;
const Errors = require('common-errors');
const is = require('is');
const noop = require('lodash/noop');
const _require = require('@microfleet/utils').require;
const { fromPathToName } = require('../../../helpers/actionName');

export type HapiIncomingMessage = IncomingMessage & {
  path: string,
  payload: Object,
  query: Object,
  method: 'PUT' | 'DELETE' | 'GET' | 'POST' | 'PATCH' | 'HEAD',
};

module.exports = function getHapiAdapter(service: Mservice, config: Object) {
  const Boom = _require('boom');
  const { router } = service;

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

      default:
        statusCode = 'statusCode' in error ? error.statusCode : 500;
    }

    if (is.array(errors) && errors.length) {
      const [nestedError] = errors;
      errorMessage = nestedError.text || nestedError.message || undefined;
    }

    const replyError = Boom.boomify(error, { statusCode, message: errorMessage });

    if (error.name) {
      replyError.output.payload.name = error.name;
    }

    return replyError;
  };

  // pre-wrap the function so that we do not need to actually do fromNode(next)
  const dispatch = Promise.promisify(router.dispatch, { context: router });

  return async function handler(request: HapiIncomingMessage) {
    const actionName = fromPathToName(request.path, config.prefix);
    const { headers } = request;

    let parentSpan;
    if (service._tracer !== undefined) {
      parentSpan = service._tracer.extract(headers, FORMAT_HTTP_HEADERS);
    }

    const serviceRequest: ServiceRequest = {
      headers,
      params: request.payload,
      query: request.query,
      method: (request.method.toLowerCase(): any),

      // transport type
      transport: ActionTransport.http,
      transportRequest: request,

      // defaults for consistent object map
      action: noop,
      route: '',

      // opentracing
      parentSpan,
      span: undefined,

      // set to console
      log: (console: any),
    };

    let response;
    try {
      response = await dispatch(actionName, serviceRequest);
    } catch (e) {
      response = reformatError(e);
    }

    return response;
  };
};
