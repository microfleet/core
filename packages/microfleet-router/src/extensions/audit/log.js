// @flow
const is = require('is');
const Promise = require('bluebird');

export type AuditLogExtension = {
  auditLog: {
    start: [number, number],
    execTime?: [number, number],
  },
};

module.exports = [
  {
    point: 'preRequest',
    handler(route: string, request: ServiceRequest & AuditLogExtension) {
      request.auditLog = { start: process.hrtime() };
      return Promise.resolve([route, request]);
    },
  },
  {
    point: 'preResponse',
    handler(error: MserviceError | void, result: mixed, request: ServiceRequest & AuditLogExtension) {
      const service = this;
      const execTime = request.auditLog.execTime = process.hrtime(request.auditLog.start);

      const meta = {
        route: request.route,
        params: request.params,
        method: request.method,
        transport: request.transport,
        headers: request.headers,
        query: request.query,
        latency: (execTime[0] * 1000) + (+(execTime[1] / 1000000).toFixed(3)),
      };

      if (error) {
        const err = is.fn(error.toJSON) ? error.toJSON() : error.toString();
        const level = error.statusCode && error.statusCode < 400 ? 'info' : 'error';
        request.log[level](meta, 'Error performing operation', err);
      } else {
        request.log.info(meta, 'completed operation', service._config.debug ? result : '');
      }

      return Promise.resolve([error, result]);
    },
  },
];
