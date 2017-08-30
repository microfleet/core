// @flow
import type { ServiceAction, RouteMap } from '../../../types';

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

  if (is.defined(action.allowed) === true && is.fn(action.allowed) !== true) {
    throw new Errors.ValidationError('action.allowed must be a function');
  }

  if (is.defined(action.auth) === true && is.string(action.auth) !== true) {
    throw new Errors.ValidationError('action.auth must be a string');
  }

  if (is.defined(action.schema) === true && is.string(action.schema) !== true) {
    throw new Errors.ValidationError('action.schema must be a string');
  }

  if (is.array(action.transports) === false) {
    throw new Errors.ValidationError('action.transports must be a array');
  }
}

function loadActions(paths) {
  const directories = Array.isArray(paths) ? paths : [paths];
  const actions = Object.create(null);

  directories
    .forEach((directory) => {
      glob.sync('*.js', { cwd: directory, matchBase: true })
        .forEach((file) => {
          // remove .js from route, replace / with . for route
          const route = file.slice(0, -3).split(path.sep).join('.');

          if (actions[route]) {
            throw new Errors.AlreadyInUseError(`${route} already exists`);
          }

          actions[route] = {
            route,
            path: path.resolve(directory, file),
          };
        });
    });

  return actions;
}

/**
 * @param {Object} config - Routes configuration object.
 * @param {string} config.directory - Actions directory, will be glob scanned.
 * @param {Object} config.enabled - Enabled routes list, mapped key as filename to value as route name. If empty - loads all routes.
 * @param {string} config.prefix - Routes prefix, useful for launching on a certain namespace.
 * @param {boolean} config.setTransportsAsDefault - Set action transports from config transports, so they don't need to be specified.
 * @param {String[]} config.transports - Enabled transports list.
 */
function getRoutes(config: Object): RouteMap {
  // lack of prototype makes it easier to search for a key
  const routes: RouteMap = Object.create(null, {
    _all: {
      value: Object.create(null),
      writable: false,
      enumerable: true,
      configurable: false,
    },
  });

  const actions = loadActions(config.directory);
  const enabled = config.enabled;

  // if enabled actions is empty load all actions from directory
  if (Object.keys(enabled).length === 0) {
    Object
      .keys(actions)
      .forEach((route) => {
        enabled[route] = route;
      });
  }

  config.transports.forEach((transport) => {
    routes[transport] = Object.create(null);
  });

  Object.keys(enabled).forEach((route) => {
    const routeName = enabled[route];
    const routingKey = config.prefix.length
      ? `${config.prefix}.${routeName}`
      : routeName;
    // eslint-disable-next-line import/no-dynamic-require
    const action = require(actions[route].path);

    if (config.setTransportsAsDefault === true && action.transports === undefined) {
      action.transports = config.transports.slice(0);
    }

    validateAction(action);

    // action name is the same as a route name
    action.actionName = routeName;

    // add action
    routes._all[routingKey] = action;

    intersection(config.transports, action.transports).forEach((transport) => {
      routes[transport][routingKey] = action;
    });
  });

  return routes;
}

module.exports = getRoutes;
