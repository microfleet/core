// @flow
import typeof Mservice from '../../../../../index';

const { ActionTransport } = require('../../../../../constants');
const { fromNameToPath } = require('../../../helpers/actionName');
const hapiRouterAdapter = require('./adapter');
const verifyPossibility = require('../../../../router/verifyAttachPossibility');

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
