const _ = require('lodash');
const assert = require('assert');
const debug = require('debug')('mservice:router');
const is = require('is');
const path = require('path');

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

function attachRouter(config) {
  debug('Attaching router plugin');

  if (is.fn(this.validateSync)) {
    // @todo uncomment
    //assert.ifError(this.validateSync('router', config).error);
  }

  // @todo validate transports (plugin included)

  const routes = initRoutes(config);
  const service = this;

  function getRouterByTransport(transport) {
    // @todo validate transport

    return require('./router/adapters/socketIO')(service);
  }

  this._router = {
    getRouterByTransport,
    routes,
  };
}

module.exports = {
  attach: attachRouter,
  name: 'router',
};
