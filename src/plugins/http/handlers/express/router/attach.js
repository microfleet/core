const { ActionTransport } = require('../../../../../');
const { fromNameToPath } = require('../../../helpers/actionName');
const getHTTPRouterAdapter = require('./adapter');
const verifyPossibility = require('../../../../router/verifyAttachPossibility');
const _require = require('../../../../../utils/require');

function attachHTTPRouter(service, handler, config) {
  const bodyParser = _require('body-parser');
  verifyPossibility(service.router, ActionTransport.http);
  const path = fromNameToPath('*', config.prefix);
  const handleRequest = getHTTPRouterAdapter(service.router, config);

  // setup the router
  handler.use(bodyParser.json());
  handler.route(path)
    .get(handleRequest)
    .post(handleRequest);
}

module.exports = attachHTTPRouter;
