// @flow
import type { $Application } from 'express';
import typeof Mservice from '../../../../../index';

const { ActionTransport } = require('../../../../../constants');
const { fromNameToPath } = require('../../../helpers/actionName');
const getHTTPRouterAdapter = require('./adapter');
const verifyPossibility = require('../../../../router/verifyAttachPossibility');
const _require = require('../../../../../utils/require');

function attachHTTPRouter(service: Mservice, handler: $Application, config: Object): void {
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
