// @flow
import type { ServiceRequest } from '../../../types';

const Errors = require('common-errors');
const moduleLifecycle = require('./lifecycle');
const Promise = require('bluebird');

function response(err: any, result: any) {
  const service = this;

  if (err) {
    switch (err.constructor) {
      case Errors.AuthenticationRequiredError:
      case Errors.ConnectionError:
      case Errors.HttpStatusError:
      case Errors.NotImplementedError:
      case Errors.NotFoundError:
      case Errors.NotPermittedError:
      case Errors.NotSupportedError:
      case Errors.TimeoutError:
      case Errors.ValidationError:
        return Promise.reject(err);
      default:
        service.log.fatal('unexpected error', err);
        return Promise.reject(new Errors.Error(`Something went wrong: ${err.message}`, err));
    }
  }

  return Promise.resolve(result);
}

function responseHandler(params: [?Error, mixed, ServiceRequest]): * {
  const service = this;
  return moduleLifecycle('response', response, service.router.extensions, (params: any), service);
}

module.exports = responseHandler;
