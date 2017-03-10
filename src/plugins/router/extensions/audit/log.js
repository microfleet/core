const is = require('is');
const Promise = require('bluebird');

module.exports = [
  {
    point: 'preRequest',
    handler: (route, request) => {
      request.auditLog = { start: process.hrtime() };
      return Promise.resolve([route, request]);
    },
  },
  {
    point: 'preResponse',
    handler: function preResponse(error, result, request) {
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
        const level = err && err.statusCode && err.statusCode < 400 ? 'info' : 'error';
        service.log[level](meta, 'Error performing operation', err);
      } else {
        service.log.info(meta, 'completed operation', service._config.debug ? result : '');
      }

      return Promise.resolve([error, result]);
    },
  },
];
