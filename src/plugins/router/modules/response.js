// @flow
const { MSError } = require('@microfleet/transport-amqp/lib/utils/serialization');
const Promise = require('bluebird');
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
const { HttpStatusError: HttpError } = require('@microfleet/validation');
const moduleLifecycle = require('./lifecycle');

function response(err: any, result: any) {
  const service = this;

  if (err) {
    // eslint-disable-next-line default-case
    switch (err.constructor) {
      case AuthenticationRequiredError:
      case ConnectionError:
      case HttpStatusError:
      case HttpError:
      case NotImplementedError:
      case NotFoundError:
      case NotPermittedError:
      case NotSupportedError:
      case TimeoutError:
      case ValidationError:
      case CError:
        return Promise.reject(err);
    }

    if (err.constructor === MSError) {
      // eslint-disable-next-line default-case
      switch (err.name) {
        case 'AuthenticationRequiredError':
        case 'ConnectionError':
        case 'HttpStatusError':
        case 'NotImplementedError':
        case 'NotFoundError':
        case 'NotPermittedError':
        case 'NotSupportedError':
        case 'TimeoutError':
        case 'ValidationError':
          return Promise.reject(err);
      }
    }

    service.log.fatal('unexpected error', err);
    return Promise.reject(new CError(`Something went wrong: ${err.message}`, err));
  }

  return Promise.resolve(result);
}

function responseHandler(params: [?Error, mixed, ServiceRequest]): Promise<*> {
  const service = this;
  return moduleLifecycle('response', response, service.router.extensions, (params: any), service);
}

module.exports = responseHandler;
