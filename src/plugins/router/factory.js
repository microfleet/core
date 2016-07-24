const dispatcher = require('./dispatcher');
const Extensions = require('./extensions');
const getAllowedModule = require('./modules/allowed');
const getAuthModule = require('./modules/auth');
const getHandlerModule = require('./modules/handler');
const getResponseHandler = require('./modules/response');
const getRequestModule = require('./modules/request');
const getRoutes = require('./routes');
const getValidateModule = require('./modules/validate');

/**
 * @param {Object}   config
 * @param {Object}   config.auth       - auth module config
 * @param {Object}   config.extensions - extensions config
 * @param {Object}   config.routes     - routes config
 * @param {Mservice} service           - MService instance
 */
function getRouter(config, service) {
  const router = { modules: {} };

  router.dispatch = dispatcher;
  router.config = config;
  router.extensions = new Extensions(config.extensions);
  router.routes = getRoutes(config.routes);
  router.service = service;

  router.modules.allowed = getAllowedModule();
  router.modules.auth = getAuthModule(config.auth);
  router.modules.handler = getHandlerModule();
  router.modules.response = getResponseHandler;
  router.modules.request = getRequestModule();
  router.modules.validate = getValidateModule();

  return router;
}

module.exports = getRouter;
