'use strict';

const Errors = require('common-errors');
const is = require('is');
const moduleLifecycle = require('./lifecycle');
const Promise = require('bluebird');

function allowed(request) {
  return Promise.resolve(request).bind(this).then(request.action.allowed).return(request).catch(error => {
    if (error.constructor === Errors.NotPermittedError) {
      return Promise.reject(error);
    }

    return Promise.reject(new Errors.NotPermittedError(error));
  });
}

function allowedHandler(request) {
  if (request.action === undefined) {
    return Promise.reject(new Errors.ArgumentError('"request" must have property "action"'));
  }

  if (is.undefined(request.action.allowed) === true) {
    return Promise.resolve(request);
  }

  return moduleLifecycle('allowed', allowed, this.router.extensions, [request], this);
}

function getAllowedHandler() {
  return allowedHandler;
}

module.exports = getAllowedHandler;