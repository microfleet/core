// @flow
const assert = require('assert');
const debug = require('debug')('mservice:attach:router');
const { NotFoundError, NotSupportedError } = require('common-errors');
const is = require('is');
const noop = require('lodash/noop');
const getRouter = require('./router/factory');
const { PluginsTypes, ActionTransport: { internal } } = require('../constants');

/**
 * Plugin Name
 * @type {String}
 */
exports.name = 'router';

/**
 * Plugin Type
 * @type {String}
 */
exports.type = PluginsTypes.essential;

/**
 * Fills gaps in default service request.
 * @param  {Object<{ params: Object, headers: Object | Null }>} request - Service Request.
 * @returns {ServiceRequest} - Prepared service request.
 */
const prepareRequest = (request: { params: Object, headers: Object }) => ({
  // input params
  params: {
    ...request.params, // shallow-copy for in-same process editing
  },
  headers: {
    ...request.headers, // shallow-copy for in-same process editing
  },
  // to provide similar interfaces
  transport: internal,
  method: internal,
  // initiate action to ensure that we have prepared proto fo the object
  action: noop,
  route: '',
  // make sure we standardize the request
  query: Object.create(null),
  transportRequest: Object.create(null),
  // pass raw span
  parentSpan: undefined,
  span: undefined,

  // set to console
  log: (console: any),
});

/**
 * Enables router plugin.
 * @param {Object} config - Router configuration object.
 */
exports.attach = function attachRouter(config: Object): void {
  debug('Attaching router plugin');

  /** @type {Mservice} */
  const service = this;

  if (is.undefined(service._log) === true) {
    throw new NotFoundError('log module must be included');
  }

  if (is.undefined(service._validator) === true) {
    throw new NotFoundError('validator module must be included');
  }

  assert.ifError(service.validator.validateSync('router', config).error);

  config.routes.transports.forEach((transport) => {
    if (service.config.plugins.includes(transport) === false && transport !== internal) {
      throw new NotSupportedError(`transport ${transport}`);
    }
  });

  this._router = getRouter(config, service);

  const { prefix } = config.routes;
  const assemble = prefix
    ? route => `${prefix}.${route}`
    : route => route;

  // dispatcher
  this.dispatch = (route: string, request: Object) => {
    const opts: ServiceRequest = prepareRequest(request);
    return this._router.dispatch(assemble(route), opts);
  };
};
