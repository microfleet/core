// @flow
const intersection = require('lodash/intersection');
const glob = require('glob');
const Errors = require('common-errors');
const is = require('is');
const path = require('path');

/**
 * Validated that each discovered action conforms to composition rules.
 *
 * @param {Function} action - Action definition.
 * @param {Function} action.allowed - Static property, if defined must be a function.
 * @param {string} action.auth - Static property, if defined must reference existing auth schema.
 * @param {string} action.schema - Static property, if defined must reference json-schema.
 * @param {Array} action.transports - Static property, must be defined to show enabled transports for the method.
 */
function validateAction(action: ServiceAction) {
  if (is.fn(action) === false) {
    throw new Errors.ValidationError('action must be a function');
  }

  const {
    allowed,
    auth,
    schema,
    transports,
  } = action;

  if (is.defined(allowed) === true && is.fn(allowed) !== true) {
    throw new Errors.ValidationError('action.allowed must be a function');
  }

  if (is.defined(auth) === true && (is.string(auth) === true || is.object(auth) === true) === false) {
    throw new Errors.ValidationError('action.auth must be a string or an object');
  }

  if (is.defined(schema) === true && is.string(schema) !== true) {
    throw new Errors.ValidationError('action.schema must be a string');
  }

  if (is.array(transports) === false) {
    throw new Errors.ValidationError('action.transports must be an array');
  }
}

/**
 * @param {Object} config - Routes configuration object.
 * @param {string} config.directory - Actions directory, will be glob scanned.
 * @param {Object} config.enabled - Enabled routes list, mapped key as filename to value as route name. If empty - loads all routes.
 * @param {string} config.prefix - Routes prefix, useful for launching on a certain namespace.
 * @param {boolean} config.setTransportsAsDefault - Set action transports from config transports, so they don't need to be specified.
 * @param {string[]} config.transports - Enabled transports list.
 */
function getRoutes(config: Object): RouteMap {
  // lack of prototype makes it easier to search for a key
  const routes = {
    _all: Object.create(null),
  };

  const { enabled } = config;

  // if enabled actions is empty load all actions from directory
  if (Object.keys(enabled).length === 0) {
    glob.sync('*.js', { cwd: config.directory, matchBase: true })
      .forEach((file) => {
        // remove .js from route
        const route = file.slice(0, -3);

        // replace / with . for route
        enabled[route] = route.split(path.sep).join('.');
      });
  }

  config.transports.forEach((transport) => {
    routes[transport] = Object.create(null);
  });

  Object.keys(enabled).forEach((route) => {
    const routingKey = config.prefix.length ? `${config.prefix}.${enabled[route]}` : enabled[route];
    // eslint-disable-next-line import/no-dynamic-require
    const action = require(path.resolve(config.directory, route));

    // it mutates existing action, so use with caution and best
    // explicitely supply the transports to support
    if (config.setTransportsAsDefault === true && action.transports === undefined) {
      action.transports = config.transports.slice(0);
    }

    try {
      validateAction(action);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Failed to process action:', action);
      throw e;
    }

    // action name is the same as a route name
    action.actionName = enabled[route];

    // add action
    routes._all[routingKey] = action;

    intersection(config.transports, action.transports).forEach((transport) => {
      routes[transport][routingKey] = action;
    });
  });

  // reset prototype for faster access along the way
  Object.setPrototypeOf(routes, null);

  // cast to RouteMap
  return ((routes: any): RouteMap);
}

module.exports = getRoutes;
