const { ActionTransport } = require('../../../../../');
const { fromNameToPath } = require('../../../helpers/actionName');
const getHTTPRouterAdapter = require('./adapter');
const verifyPossibility = require('../../../../router/verifyAttachPossibility');

function attachHTTPRouter(service, handler, config) {
  const bodyParser = service._require('body-parser');
  verifyPossibility(service.router, ActionTransport.http);
  const path = fromNameToPath('*', config.prefix);
  handler.use(bodyParser.json());
  handler.post(path, getHTTPRouterAdapter(service.router, config));
}

module.exports = attachHTTPRouter;
