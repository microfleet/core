const { ActionTransport } = require('./../../../../../');
const { fromNameToPath } = require('./../../../helpers/actionName');
const hapiRouterAdapter = require('./adapter');
const verifyPossibility = require('./../../../../router/verifyAttachPossibility');

module.exports = function attachRouter(server, router, config) {
  verifyPossibility(router, ActionTransport.http);
  const path = fromNameToPath('{p*}', config.prefix);
  server.route({
    path,
    handler: hapiRouterAdapter(router, config),
    method: 'POST',
  });
};
