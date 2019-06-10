import { Microfleet } from '../../../..'
import { MserviceError } from '../../../../types'
import { LifecyclePoints, ExtensionPlugin } from '..'
import { storeRequestTimeFactory, ServiceRequestWithStart } from '../sharedHandlers'

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

export default function metricObservabilityFactory(): ExtensionPlugin[] {

  return [
    storeRequestTimeFactory(),
    {
      point: LifecyclePoints.postResponse,
      async handler(this: Microfleet, e: MserviceError, r: any, _: Error, __: any, request: ServiceRequestWithStart) {

        const { metricMicrofleetDuration } = this
        const latency = diff(request.started)
        const labels = {
          method: request.method,
          // NOTE: route empty in case of 404 - should we extract real path from the `transportRequest` ?
          route: request.route,
          transport: request.transport,
          statusCode: extractStatusCode(e),
        }
        metricMicrofleetDuration.observe(labels, latency)

        return [e, r]
      },
    },
  ]
}
