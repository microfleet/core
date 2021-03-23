import { strict as assert } from 'assert'
import type { Microfleet, MserviceError } from '@microfleet/core-types'

import { Lifecycle, LifecycleExtension, Extensions } from '@microfleet/plugin-router'
import type { ServiceRequest } from '@microfleet/plugin-router'

function extractStatusCode(error: MserviceError): number {
  if (!error) {
    return 200
  }

  switch (error.name) {
    case 'AuthenticationRequiredError':
      return 400
    case 'ValidationError':
      return 401
    case 'NotPermittedError':
      return 403
    case 'NotFoundError':
      return 404
    case 'NotSupportedError':
      return 405
    default:
      return error.statusCode || 500
  }
}

export const metricObservability: LifecycleExtension[] = [
  Extensions.initTimingExtension,
  {
    point: Lifecycle.hooks.postResponse,
    async handler(this: Microfleet, request: ServiceRequest): Promise<void> {
      assert(request.requestStarted !== undefined)

      const latency = Extensions.hrTimeDurationInMs(request.requestStarted, request.requestEnded || process.hrtime()) || 0
      const labels = {
        method: request.method,
        // NOTE: route empty in case of 404 - should we extract real path from the `transportRequest` ?
        route: request.route,
        transport: request.transport,
        statusCode: extractStatusCode(request.error),
      }

      this.metricMicrofleetDuration.observe(labels, latency)
    },
  },
]
