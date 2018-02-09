// @flow
import typeof Mservice from '@microfleet/core';

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
 * Initializes router.
 * @param {Object} config - Router configuration object.
 * @param {Object} config.auth - Auth module configuration object.
 * @param {Object} config.extensions - Extensions configuration object.
 * @param {Object} config.routes - Routes configuration object.
 * @param {Mservice} service - Mservice instance.
 * @returns {Router} Router instance.
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
