// @flow
import type { ServiceRequest } from '../../../types';

const debug = require('debug')('mservice:router:module:request');
const Errors = require('common-errors');
const is = require('is');
const moduleLifecycle = require('./lifecycle');
const Promise = require('bluebird');

function getAction(route: string, request: ServiceRequest): Promise<any> {
  debug('handler for module "request"');
  const service = this;
  const transport = request.transport;

  if (is.undefined(transport) === true) {
    return Promise.reject(new Errors.ArgumentError('"request" must have property "transport"'));
  }

  const action = service.router.routes[transport][route];

  if (is.undefined(action) === true) {
    return Promise.reject(new Errors.NotFoundError(`route "${route}" not found`));
  }

  request.action = action;
  request.route = route;

  return Promise.resolve(request);
}

function requestHandler(route: string, request: ServiceRequest): Promise<any> {
  const service = this;
  const extensions = service.router.extensions;

  return moduleLifecycle('request', getAction, extensions, [route, request], service);
}

module.exports = requestHandler;
