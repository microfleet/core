const _ = require('lodash');
const glob = require('glob');
const Errors = require('common-errors');
const is = require('is');
const path = require('path');

/**
 * @param {Function}      action
 * @param {Function} action.allowed
 * @param {String}        action.auth
 * @param {String}        action.schema
 * @param {Array}         action.transports
 */
function validateAction(action) {
  if (is.function(action) === false) {
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

/**
 * @param {Object}   config                        - routes config
 * @param {String}   config.directory              - actions directory
 * @param {Object}   config.enabled                - enabled routes list,
 *                                                   mapped key as filename to value as route name
 * @param {String}   config.prefix                 - routes prefix
 * @param {Boolean}  config.setTransportsAsDefault - set action transports from config transports
 * @param {String[]} config.transports             - enabled transports list
 */
function getRoutes(config) {
  const routes = { _all: {} };
  const enabled = config.enabled;

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
    routes[transport] = {};
  });

  Object.keys(enabled).forEach((route) => {
    const routingKey = config.prefix.length ? `${config.prefix}.${enabled[route]}` : enabled[route];
    const action = require(path.resolve(config.directory, route));

    if (config.setTransportsAsDefault === true && action.transports === undefined) {
      action.transports = config.transports.slice(0);
    }

    validateAction(action);

    action.actionName = route;

    routes._all[routingKey] = action;
    _.intersection(config.transports, action.transports).forEach((transport) => {
      routes[transport][routingKey] = action;
    });
  });

  return routes;
}

module.exports = getRoutes;
