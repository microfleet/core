// @flow
const Promise = require('bluebird');
const moduleLifecycle = require('./lifecycle');
const {
  AuthenticationRequiredError,
  ConnectionError,
  HttpStatusError,
  NotImplementedError,
  NotFoundError,
  NotPermittedError,
  NotSupportedError,
  TimeoutError,
  ValidationError,
  Error: CError,
} = require('common-errors');

function response(err: any, result: any) {
  const service = this;

  if (err) {
    switch (err.constructor) {
      case AuthenticationRequiredError:
      case ConnectionError:
      case HttpStatusError:
      case NotImplementedError:
      case NotFoundError:
      case NotPermittedError:
      case NotSupportedError:
      case TimeoutError:
      case ValidationError:
      case CError:
        return Promise.reject(err);
      default:
        service.log.fatal('unexpected error', err);
        return Promise.reject(new CError(`Something went wrong: ${err.message}`, err));
    }
  }

  return Promise.resolve(result);
}

function responseHandler(params: [?Error, mixed, ServiceRequest]): * {
  const service = this;
  return moduleLifecycle('response', response, service.router.extensions, (params: any), service);
}

module.exports = responseHandler;
