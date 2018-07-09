// @flow
import typeof Mservice from '../../../../../index';

const defaults = require('lodash/defaults');
const get = require('lodash/get');
const omit = require('lodash/omit');

const { ActionTransport } = require('../../../../../constants');
const { fromNameToPath, fromPathToName } = require('../../../helpers/actionName');
const hapiRouterAdapter = require('./adapter');
const verifyPossibility = require('../../../../router/verifyAttachPossibility');

module.exports = function attachRouter(service: Mservice, config: Object) {
  verifyPossibility(service.router, ActionTransport.http);

  return {
    plugin: {
      name: 'microfleetRouter',
      version: '1.0.0',
      async register(server: Object) {
        /* eslint-disable-next-line no-restricted-syntax */
        for (const [actionName, handler] of Object.entries(service.router.routes.http)) {
          const path = fromNameToPath(actionName, config.prefix);
          const defaultOptions = {
            path,
            handler: hapiRouterAdapter(actionName, service),
            method: ['GET', 'POST'],
          };
          const handlerOptions = omit(get(handler, 'transportOptions.handlers.hapi', Object.create(null)), ['path', 'handler']);

          server.route(defaults(handlerOptions, defaultOptions));
        }

        server.route({
          path: '/{any*}',
          handler: (request) => {
            const actionName = fromPathToName(request.path, config.prefix);
            const handler = hapiRouterAdapter(actionName, service);

            return handler(request);
          },
          method: ['GET', 'POST'],
        });
      },
    },
    options: {},
  };
};
