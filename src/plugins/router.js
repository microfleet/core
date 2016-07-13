const _ = require('lodash');
const Allowed = require('./router/modules/allowed');
const assert = require('assert');
const Auth = require('./router/modules/auth');
const debug = require('debug')('mservice:router');
const dispatcher = require('./router/dispatcher');
const Extension = require('./router/extension');
const is = require('is');
const path = require('path');
const Validate = require('./router/modules/validate');

function initRoutes(config) {
  // @todo: if actionsConfig.enabled is empty attach all routes from directory
  const actionsConfig = config.actions;
  const routes = { _all: {} };

  actionsConfig.transports.forEach(transport => {
    routes[transport] = {};
  });

  Object.keys(actionsConfig.enabled).map(route => {
    const routingKey = [actionsConfig.prefix, actionsConfig.enabled[route]].join('.');
    const action = require(path.resolve(actionsConfig.directory, route));
    // @todo validate action
    routes._all[routingKey] = action;
    _.intersection(actionsConfig.transports, action.transports).forEach(transport => {
      routes[transport][routingKey] = action
    });
  });

  return routes;
}

function attachRouter(config = {}) {
  debug('Attaching router plugin');

  if (is.fn(this.validateSync)) {
    //assert.ifError(this.validateSync('router', config).error);
  }

  // @todo validate transports (plugin included)

  this._router = {
    modules: {
      allowed: Allowed(config.allowed),
      auth: Auth(config.auth),
      validate: Validate(config.validate),
    },
    dispatcher,
    extension: new Extension(this, config.extensions),
    routes: initRoutes(config),
    service: this,
  };
}

module.exports = {
  attach: attachRouter,
  name: 'router',
};
