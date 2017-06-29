// @flow
import type { ServiceRequest } from '../../types';

/**
 * Project deps
 * @private
 */
const is = require('is');
const Promise = require('bluebird');
const debug = require('debug')('mservice:router:dispatch');
const { ERROR, COMPONENT } = require('opentracing').Tags;

const wrapPromise = (span: any, promise: any, callback: () => mixed | void) => (
  promise.catch((err) => {
    span.setTag(ERROR, true);
    span.log({ event: 'error', 'error.object': err, message: err.message, stack: err.stack });
    throw err;
  })
  .finally(() => {
    span.finish();
  })
  .asCallback(callback)
);

function reflectToProps(reflection) {
  return reflection.isRejected()
    ? [reflection.reason(), undefined, this]
    : [null, reflection.value(), this];
}

function dispatch(route: string, request: ServiceRequest, callback: () => mixed | void): Promise<*> | void {
  const router = this;
  const modules = router.modules;
  const service = router.service;

  debug('initiating request on route %s', route);

  // if we have installed tracer - init span
  let span;
  if (service._tracer !== undefined) {
    span = request.span = service._tracer.startSpan(`dispatch:${route}`, {
      childOf: request.parentSpan,
      tags: {
        [COMPONENT]: request.transport,
      },
    });
  }

  let result = Promise
    .bind(service, [route, request])
    .spread(modules.request)
    .then(modules.auth)
    .then(modules.validate)
    .then(modules.allowed)
    .then(modules.handler);

  if (is.fn(callback)) {
    result = result
      .reflect() // <-- reflect promise
      .bind(request) // <-- bind to request
      .then(reflectToProps) // <-- process data
      .bind(service) // <-- bind back to service
      .then(modules.response);
  }

  return span !== undefined
    ? wrapPromise(span, result, callback)
    : result.asCallback(callback);
}

module.exports = dispatch;
