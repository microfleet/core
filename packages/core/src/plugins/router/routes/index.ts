import { ValidationError } from 'common-errors';
import glob = require('glob');
import is = require('is');
import intersection = require('lodash.intersection');
import path = require('path');
import { Microfleet } from '../../../';
import { IServiceRequest } from '../../../types';
import { IRouteMap } from '../factory';

export interface IRoutes {
  [name: string]: string;
}

function readRoutes(directory: string) {
  return glob.sync('*.js', { cwd: directory, matchBase: true })
    .map((file) => {
      // remove .js from route
      const route = file.slice(0, -3);

      // replace / with . for route
      const routeKey = route.split(path.sep).join('.');
      return [route, routeKey];
    });
}

const GENERIC_ROUTES = Object.create(null);
const GENERIC_ROUTES_PATH = path.resolve(__dirname, 'generic');

for (const [filepath, action] of readRoutes(GENERIC_ROUTES_PATH)) {
  const route = path.resolve(GENERIC_ROUTES_PATH, filepath);
  GENERIC_ROUTES[action] = {
    route,
    routeKey: `generic.${action}`,
  };
}

/**
 * Validated that each discovered action conforms to composition rules.
 *
 * @param {Function} action - Action definition.
 * @param {Function} action.allowed - Static property, if defined must be a function.
 * @param {string} action.auth - Static property, if defined must reference existing auth schema.
 * @param {string} action.schema - Static property, if defined must reference json-schema.
 * @param {Array} action.transports - Static property, must be defined to show enabled transports for the method.
 */
function validateAction(action: IServiceRequest['action']) {
  if (is.fn(action) === false) {
    throw new ValidationError('action must be a function');
  }

  const {
    allowed,
    auth,
    schema,
    transports,
  } = action;

  if (is.defined(allowed) === true && is.fn(allowed) !== true) {
    throw new ValidationError('action.allowed must be a function');
  }

  if (is.defined(auth) === true && (is.string(auth) === true || is.object(auth) === true) === false) {
    throw new ValidationError('action.auth must be a string or an object');
  }

  if (is.defined(schema) === true && is.string(schema) !== true) {
    throw new ValidationError('action.schema must be a string');
  }

  if (is.array(transports) === false) {
    throw new ValidationError('action.transports must be an array');
  }
}

/**
 * @param config - Routes configuration object.
 * @param config.directory - Actions directory, will be glob scanned.
 * @param config.enabled - Enabled routes list, mapped key as filename to
 *  value as route name. If empty - loads all routes.
 * @param config.prefix - Routes prefix, useful for launching on a certain namespace.
 * @param config.setTransportsAsDefault - Set action transports from config transports,
 *  so they don't need to be specified.
 * @param config.transports - Enabled transports list.
 */
function getRoutes(this: Microfleet, config: any): IRouteMap {
  // lack of prototype makes it easier to search for a key
  const routes: IRouteMap = {
    _all: Object.create(null),
  };

  const { enabled, enabledGenericActions } = config;

  // if enabled actions is empty load all actions from directory
  if (Object.keys(enabled).length === 0) {
    for (const [route, routeKey] of readRoutes(config.directory)) {
      enabled[route] = routeKey;
    }
  }

  // and select ONLY enabled generic actions
  for (const action of enabledGenericActions) {
    try {
      const { route, routeKey } = GENERIC_ROUTES[action];
      enabled[route] = routeKey;
    } catch (e) {
      this.log.error('Available generic routes are: %s', Object.keys(GENERIC_ROUTES));
      throw new ValidationError(`unknown generic route is requested: ${action}`);
    }
  }

  for (const transport of config.transports) {
    routes[transport] = Object.create(null);
  }

  for (const [route, postfix] of Object.entries(enabled as IRoutes)) {
    const routingKey = config.prefix.length ? `${config.prefix}.${postfix}` : postfix;
    const action = require(path.resolve(config.directory, route));

    // it mutates existing action, so use with caution and best
    // explicitely supply the transports to support
    if (config.setTransportsAsDefault === true && action.transports === undefined) {
      action.transports = config.transports.slice(0);
    }

    try {
      validateAction(action);
    } catch (e) {
      this.log.warn('Failed to process action:', action);
      throw e;
    }

    // action name is the same as a route name
    action.actionName = enabled[route];

    // add action
    routes._all[routingKey] = action;

    for (const transport of intersection(config.transports as string[], action.transports as string[])) {
      routes[transport][routingKey] = action;
    }
  }

  // reset prototype for faster access along the way
  Object.setPrototypeOf(routes, null);

  // cast to RouteMap
  return routes;
}

export default getRoutes;
