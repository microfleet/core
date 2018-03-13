const { ActionTransport } = require('@microfleet/core');

/**
 * Custom action that rejects based on params.
 * @param  {ServiceRequest} request - Service Request.
 * @param  {number} request.params - Max retries.
 * @param  {Object} request.headers - AMQP properties.
 * @param  {Object} request.headers.headers - AMQP headers.
 */
module.exports = function retryAction({ params, headers: { headers } }) {
  if (headers['x-retry-count'] === undefined || headers['x-retry-count'] < params) {
    throw new Error(`count: ${headers['x-retry-count'] || 1}`);
  }

  return headers['x-retry-count'];
};

module.exports.schema = 'retryAction';

module.exports.transports = [
  ActionTransport.amqp,
];
