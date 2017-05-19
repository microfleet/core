// @flow
import typeof Mservice from '../../index';
import type { RouteMap } from '../../types';

const dispatch = require('./dispatcher');
const Extensions = require('./extensions');
const allowedModule = require('./modules/allowed');
const getAuthModule = require('./modules/auth');
const handlerModule = require('./modules/handler');
const getResponseHandler = require('./modules/response');
const requestModule = require('./modules/request');
const getRoutes = require('./routes');
const validateModule = require('./modules/validate');

/**
 * Defines router signature
 * @type {Object}
 */
export type Router = {
  config: Object,
  service: Mservice,
  dispatch: typeof dispatch,
  extensions: Extensions,
  routes: RouteMap,
  modules: {
    request: typeof requestModule,
    auth: typeof getAuthModule,
    validate: typeof validateModule,
    allowed: typeof allowedModule,
    handler: typeof handlerModule,
    response: typeof getResponseHandler,
  },
};

/**
 * @param {Object}   config
 * @param {Object}   config.auth       - auth module config
 * @param {Object}   config.extensions - extensions config
 * @param {Object}   config.routes     - routes config
 * @param {Mservice} service           - MService instance
 */
function getRouter(config: Object, service: Mservice): Router {
  const router: Router = {
    config,
    service,
    dispatch,
    extensions: new Extensions(config.extensions),
    routes: getRoutes(config.routes),
    modules: {
      request: requestModule,
      auth: getAuthModule(config.auth),
      validate: validateModule,
      allowed: allowedModule,
      handler: handlerModule,
      response: getResponseHandler,
    },
  };

  return router;
}

module.exports = getRouter;
