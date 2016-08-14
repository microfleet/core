const _ = require('lodash');
const debug = require('debug')('mservice:router:module:lifecycle');
const is = require('is');
const Errors = require('common-errors');
const Extensions = require('../../extensions');
const Promise = require('bluebird');

function moduleLifecycle(module, promiseFactory, extensions, args, context) {
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

  const upperFirstName = _.upperFirst(module);
  const preModule = `pre${upperFirstName}`;
  const postModule = `post${upperFirstName}`;
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
    .then(inspection => {
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

      return Promise.resolve([postModule, [errorResponse, resultResponse, ...args], context])
        .bind(extensions)
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
