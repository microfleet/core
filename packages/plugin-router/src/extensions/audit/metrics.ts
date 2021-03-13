import { strict as assert } from 'assert'
import type { Microfleet, MserviceError } from '@microfleet/core-types'

import Lifecycle, { LifecycleExtensions } from '../../lifecycle'
import { getInitTimingExtension } from './timing'
import { hrTimeDurationInMs } from '../audit/log'
import type { ServiceRequest } from '../../types/router'

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

export default function metricObservabilityFactory(): LifecycleExtensions {
  return [
    getInitTimingExtension(),
    {
      point: Lifecycle.hooks.postResponse,
      async handler(this: Microfleet, request: ServiceRequest): Promise<void> {
        assert(request.requestStarted !== undefined)

        const { metricMicrofleetDuration } = this
        const latency = hrTimeDurationInMs(request.requestStarted, request.requestEnded || process.hrtime()) || 0
        const labels = {
          method: request.method,
          // NOTE: route empty in case of 404 - should we extract real path from the `transportRequest` ?
          route: request.route,
          transport: request.transport,
          statusCode: extractStatusCode(request.error),
        }

        metricMicrofleetDuration.observe(labels, latency)
      },
    },
  ]
}
