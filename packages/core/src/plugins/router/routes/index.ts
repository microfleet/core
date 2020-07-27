import { ValidationError } from 'common-errors'
import glob = require('glob')
import is = require('is')
import { intersection}  from 'lodash'
import path = require('path')
import { Microfleet } from '../../../'
import { ServiceAction, TransportTypes } from '../../../types'
import { RouteMap } from '../factory'

export interface Routes {
  [name: string]: string;
}

const filterDefinitions = (x: string) => !x.endsWith('.d.ts')

function readRoutes(directory: string) {
  return glob
    .sync('*.{js,ts}', { cwd: directory, matchBase: true })
    .filter(filterDefinitions)
    .map((file) => {
      // remove .js/.ts from route
      const route = file.slice(0, -3)

      // replace / with . for route
      const routeKey = route.split(path.sep).join('.')
      return [route, routeKey]
    })
}

const GENERIC_ROUTES = Object.create(null)
const GENERIC_ROUTES_PATH = path.resolve(__dirname, 'generic')

for (const [filepath, action] of readRoutes(GENERIC_ROUTES_PATH)) {
  const route = path.resolve(GENERIC_ROUTES_PATH, filepath)
  GENERIC_ROUTES[action] = {
    route,
    routeKey: `generic.${action}`,
  }
}

/**
 * Validated that each discovered action conforms to composition rules.
 *
 * @param action - Action definition.
 * @param action.allowed - Static property, if defined must be a function.
 * @param action.auth - Static property, if defined must reference existing auth schema.
 * @param action.schema - Static property, if defined must reference json-schema.
 * @param action.transports - Static property, must be defined to show enabled transports for the method.
 */
function validateAction(actionLike: ServiceAction | { default: ServiceAction }, route: string): ServiceAction {
  let action: ServiceAction
  if (typeof actionLike === 'object' && actionLike && is.fn(actionLike.default)) {
    action = actionLike.default
  } else if (!is.fn(actionLike)) {
    throw new ValidationError(`action in ${route} must be a function`)
  } else {
    action = actionLike as ServiceAction
  }

  const {
    allowed,
    auth,
    schema,
    transports,
  } = action as ServiceAction

  if (is.defined(allowed) && !is.fn(allowed)) {
    throw new ValidationError(`action.allowed in ${route} must be a function`)
  }

  if (is.defined(auth) && !(is.string(auth) || is.object(auth))) {
    throw new ValidationError(`action.auth in ${route} must be a string or an object`)
  }

  if (is.defined(schema) && !is.string(schema)) {
    throw new ValidationError(`action.schema in ${route} must be a string`)
  }

  if (!Array.isArray(transports)) {
    throw new ValidationError(`action.transports in ${route} must be an array`)
  }

  return action as ServiceAction
}

export interface RoutesConfig {
  directory: string;
  prefix: string;
  setTransportsAsDefault?: boolean;
  transports: TransportTypes[];
  enabled: {
    [route: string]: string;
  };
  enabledGenericActions: string[];
  responseValidation?: {
    enabled: boolean;
    maxSample: number;
    panic: boolean;
  };
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
 * @param config.responseValidation - Response validation settings.
 */
export function getRoutes(this: Microfleet, config: RoutesConfig): RouteMap {
  // lack of prototype makes it easier to search for a key
  const routes: RouteMap = {
    _all: Object.create(null),
  }

  const { enabled, enabledGenericActions } = config

  // if enabled actions is empty load all actions from directory
  if (Object.keys(enabled).length === 0) {
    for (const [route, routeKey] of readRoutes(config.directory)) {
      enabled[route] = routeKey
    }
  }

  // and select ONLY enabled generic actions
  for (const action of enabledGenericActions) {
    try {
      const { route, routeKey } = GENERIC_ROUTES[action]
      enabled[route] = routeKey
    } catch (e) {
      this.log.error('Available generic routes are: %s', Object.keys(GENERIC_ROUTES))
      throw new ValidationError(`unknown generic route is requested: ${action}`)
    }
  }

  for (const transport of config.transports) {
    routes[transport] = Object.create(null)
  }

  for (const [route, postfix] of Object.entries(enabled as Routes)) {
    const routingKey = config.prefix.length ? `${config.prefix}.${postfix}` : postfix
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const action = require(path.resolve(config.directory, route))

    // it mutates existing action, so use with caution and best
    // explicitely supply the transports to support
    if (config.setTransportsAsDefault && action.transports === undefined) {
      action.transports = config.transports.slice(0)
    }

    try {
      const extractedAction = validateAction(action, route)

      // action name is the same as a route name
      extractedAction.actionName = enabled[route]

      // add action
      routes._all[routingKey] = extractedAction

      for (const transport of intersection(config.transports as string[], extractedAction.transports as string[])) {
        routes[transport][routingKey] = extractedAction
      }
    } catch (e) {
      this.log.warn('Failed to process action:', action)
      throw e
    }
  }

  // reset prototype for faster access along the way
  Object.setPrototypeOf(routes, null)

  // cast to RouteMap
  return routes
}
