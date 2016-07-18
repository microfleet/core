const _ = require('lodash');
const assert = require('assert');
const debug = require('debug')('mservice:router:module:lifecycle');
const is = require('is');
const Errors = require('common-errors');
const Promise = require('bluebird');

function moduleLifecycle(module, promiseFactory, extensions, args = []) {
  // @todo validate

  debug('lifecycle for module "%s"', module);

  const upperFirstName = _.upperFirst(module);
  const preModule = `pre${upperFirstName}`;
  const postModule = `post${upperFirstName}`;
  let promise;

  if (extensions.has(preModule)) {
    debug('execute pre-handlers "%s"', preModule);
    promise = extensions.exec(preModule, args);
  } else {
    promise = Promise.resolve();
  }

  return promise
    .return(args)
    .then(args => {
      debug('execute handler for module "%s"', module);

      if (extensions.has(postModule) === false) {
        return promiseFactory(...args);
      }

      return promiseFactory(...args)
        .reflect()
        .then(inspection => {
          debug('execute post-handlers for module "%s"', postModule);
          const response = {};

          if (inspection.isFulfilled()) {
            response.result = inspection.value();
          } else {
            response.error = inspection.reason();
          }

          return extensions.exec(postModule, [response])
            .then(() => {
              assert.ifError(response.error);

              return response.result;
            });
        })
    });
}

module.exports = moduleLifecycle;
