import get = require('get-value');
import { Request, Server } from 'hapi';
import defaults = require('lodash/defaults');
import omit = require('lodash/omit');
import { IHapiPlugin } from '..';
import { ActionTransport, Microfleet } from '../../../../..';
import verifyPossibility from '../../../../router/verifyAttachPossibility';
import { fromNameToPath, fromPathToName } from '../../../helpers/actionName';
import hapiRouterAdapter from './adapter';

export default function attachRouter(service: Microfleet, config: any): IHapiPlugin {
  verifyPossibility(service.router, ActionTransport.http);

  return {
    plugin: {
      name: 'microfleetRouter',
      version: '1.0.0',
      async register(server: Server) {
        for (const [actionName, handler] of Object.entries(service.router.routes.http)) {
          const path = fromNameToPath(actionName, config.prefix);
          const defaultOptions = {
            handler: hapiRouterAdapter(actionName, service),
            method: ['GET', 'POST'],
            path,
          };

          const hapiTransportOptions = get(handler, 'transportOptions.handlers.hapi', Object.create(null));
          const handlerOptions = omit(hapiTransportOptions, ['path', 'handler']);

          server.route(defaults(handlerOptions, defaultOptions));
        }

        server.route({
          method: ['GET', 'POST'],
          path: '/{any*}',
          async handler(request: Request) {
            const actionName = fromPathToName(request.path, config.prefix);
            const handler = hapiRouterAdapter(actionName, service);
            return handler(request);
          },
        });
      },
    },
  };
}
