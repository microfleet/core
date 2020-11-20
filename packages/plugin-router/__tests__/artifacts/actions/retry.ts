import { Microfleet } from '@microfleet/core'
import { ActionTransport, ServiceRequest } from '@microfleet/plugin-router'

/**
 * Custom action that rejects based on params.
 * @param  {ServiceRequest} request - Service Request.
 * @param  {number} request.params - Max retries.
 * @param  {Object} request.headers - AMQP properties.
 * @param  {Object} request.headers.headers - AMQP headers.
 */
export default function retryAction(
  this: Microfleet,
  { params, headers: { headers } }: ServiceRequest
): Promise<any> {
  if (headers['x-retry-count'] === undefined || headers['x-retry-count'] < params) {
    throw new Error(`count: ${headers['x-retry-count'] || 1}`)
  }

  return headers['x-retry-count']
}

retryAction.transports = [
  ActionTransport.amqp,
]
