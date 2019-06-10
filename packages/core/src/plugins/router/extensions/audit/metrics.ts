import { Microfleet } from '../../../..'
import { ServiceRequest, MserviceError } from '../../../../types'
import { LifecyclePoints, ExtensionPlugin } from '..'
import { storeRequestTimeFactory, ServiceRequestWithStart } from '../sharedHandlers'

function extractStatusCode(error: MserviceError): number {
  if (!error) {
    return 200
  }
  return  error.statusCode || 500
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
          route: request.route,
          transport: request.transport,
          statusCode: extractStatusCode(e),
          status: e ? 'failed' : 'succeed',
        }
        metricMicrofleetDuration.observe(labels, latency)

        return [e, r]
      },
    },
  ]
}
