const { ActionTransport } = require('../../../../../');
const { fromNameToPath } = require('../../../helpers/actionName');
const hapiRouterAdapter = require('./adapter');
const verifyPossibility = require('../../../../router/verifyAttachPossibility');

module.exports = function attachRouter(service, server, config) {
  verifyPossibility(service.router, ActionTransport.http);

  const path = fromNameToPath('{p*}', config.prefix);

  // based on the method we'd push different handlers
  server.route({
    path,
    handler: hapiRouterAdapter(service, config),
    method: ['GET', 'POST'],
  });
};
