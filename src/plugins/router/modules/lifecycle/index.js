// @flow
const Promise = require('bluebird');
const upperFirst = require('lodash/upperFirst');
const debug = require('debug')('mservice:router:module:lifecycle');
const is = require('is');
const Errors = require('common-errors');
const Extensions = require('../../extensions');

export type PromiseFactory = (...args: Array<any>) => *;

function moduleLifecycle(module: string, promiseFactory: PromiseFactory, extensions: Extensions, args: Array<any>, context: any): * {
  if (is.string(module) === false) {
    return Promise.reject(new Errors.ArgumentError('module'));
  }

  if (is.fn(promiseFactory) === false) {
    return Promise.reject(new Errors.ArgumentError('promiseFactory'));
  }

  if (is.instance(extensions, Extensions) === false) {
    return Promise.reject(new Errors.ArgumentError('extensions'));
  }

  if (is.array(args) === false) {
    return Promise.reject(new Errors.ArgumentError('args'));
  }

  debug('lifecycle for module "%s"', module);

  const upperFirstName = upperFirst(module);
  const preModule = ((`pre${upperFirstName}`: any): LifecycleRequestType);
  const postModule = ((`post${upperFirstName}`: any): LifecycleRequestType);
  let result;

  if (extensions.has(preModule)) {
    result = Promise.resolve([preModule, args, context])
      .bind(extensions)
      .spread(extensions.exec);
  } else {
    result = Promise.resolve(args);
  }

  return result
    .bind(context)
    .spread(promiseFactory)
    .reflect()
    .then((inspection) => {
      let resultResponse = null;
      let errorResponse = null;

      if (inspection.isFulfilled()) {
        resultResponse = inspection.value();
      } else {
        errorResponse = inspection.reason();
      }

      if (extensions.has(postModule) === false) {
        if (errorResponse) {
          return Promise.reject(errorResponse);
        }

        return Promise.resolve(resultResponse);
      }

      // $FlowFixMe
      return Promise
        .bind(extensions, [postModule, [errorResponse, resultResponse, ...args], context])
        .spread(extensions.exec)
        .spread((error, response) => {
          if (error) {
            return Promise.reject(error);
          }

          return Promise.resolve(response);
        });
    });
}

module.exports = moduleLifecycle;
