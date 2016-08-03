const { ActionTransport } = require('./../../../../../');
const { fromNameToPath } = require('./../../../helpers/actionName');
const bodyParser = require('body-parser');
const getHTTPRouterAdapter = require('./adapter');
const verifyPossibility = require('./../../../../router/verifyAttachPossibility');

function attachHTTPRouter(handler, config, router) {
  verifyPossibility(router, ActionTransport.http);
  const path = fromNameToPath('*', config.prefix);
  handler.use(bodyParser.json());
  handler.post(path, getHTTPRouterAdapter(router, config));
}

module.exports = attachHTTPRouter;
