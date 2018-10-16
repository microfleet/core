import is = require('is');
import { Microfleet } from '../../../..';
import { IServiceRequest, MserviceError } from '../../../../types';

export interface IAuditLogExtension {
  auditLog: {
    start: [number, number],
    execTime?: [number, number],
  };
}

export type ServiceRequestWithAuditLog = IServiceRequest & IAuditLogExtension;

export default [
  {
    point: 'preRequest',
    async handler(route: string, request: ServiceRequestWithAuditLog) {
      request.auditLog = { start: process.hrtime() };
      return [route, request];
    },
  },
  {
    point: 'preResponse',
    async handler(this: Microfleet, error: MserviceError | void, result: any, request: ServiceRequestWithAuditLog) {
      const service = this;
      const execTime = request.auditLog.execTime = process.hrtime(request.auditLog.start);

      const meta = {
        headers: request.headers,
        latency: (execTime[0] * 1000) + (+(execTime[1] / 1000000).toFixed(3)),
        method: request.method,
        params: request.params,
        query: request.query,
        route: request.route,
        transport: request.transport,
      };

      if (error) {
        const err = is.fn(error.toJSON) ? error.toJSON() : error.toString();
        const level = error.statusCode && error.statusCode < 400 ? 'info' : 'error';
        request.log[level](meta, 'Error performing operation', err);
      } else {
        request.log.info(meta, 'completed operation', service.config.debug ? result : '');
      }

      return [error, result];
    },
  },
];
