import { Microfleet } from '@microfleet/core'
import { MserviceError } from '@microfleet/core-types'

import { RouterLifecycleExtension } from '../../types/plugin'
import Lifecycle from '../../lifecycle'
import { getInitTimingExtension, ServiceRequestWithStart } from '../utils'

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

function diff(start: [number, number]): number {
  const execTime = process.hrtime(start)
  const ms = (execTime[0] * 1000) + (+(execTime[1] / 1000000))
  return parseInt(ms.toFixed(), 10)
}

export default function metricObservabilityFactory(): RouterLifecycleExtension {
  return [
    getInitTimingExtension(),
    {
      point: Lifecycle.points.postResponse,
      async handler(this: Microfleet, request: ServiceRequestWithStart) {
        const { metricMicrofleetDuration } = this
        const latency = diff(request.started)
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
