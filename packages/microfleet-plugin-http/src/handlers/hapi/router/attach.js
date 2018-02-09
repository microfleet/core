// @flow
import typeof Mservice from '@microfleet/core';

const { ActionTransport } = require('@microfleet/config').constants;
const verifyPossibility = require('@microfleet/plugin-router/src/verifyAttachPossibility');
const { fromNameToPath } = require('../../../helpers/actionName');
const hapiRouterAdapter = require('./adapter');

module.exports = function attachRouter(service: Mservice, server: Object, config: Object) {
  verifyPossibility(service.router, ActionTransport.http);

  const path = fromNameToPath('{p*}', config.prefix);

  // based on the method we'd push different handlers
  server.route({
    path,
    handler: hapiRouterAdapter(service, config),
    method: ['GET', 'POST'],
  });
};
