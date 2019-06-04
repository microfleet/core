import { Microfleet } from '../../../..'
import { ServiceRequest, MserviceError } from '../../../../types'
import { LifecyclePoints, ExtensionPlugin } from '..'


export interface MetricsExtension {
  metrics: {
    start: [number, number],
  }
}

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

export type ServiceRequestWithMetrics = ServiceRequest & MetricsExtension

export default function metricObservabilityFactory(): ExtensionPlugin[] {

  return [
    {
      point: LifecyclePoints.preRequest,
      async handler(route: string, request: ServiceRequestWithMetrics) {
        request.metrics = { start: process.hrtime() }
        return [route, request]
      },
    },
    {
      point: LifecyclePoints.postResponse,
      async handler(this: Microfleet, error: MserviceError, result: any, _: Error, __: any, request: ServiceRequestWithMetrics) {

        const { metricMicrofleetDuration } = this
        const latency = diff(request.metrics.start)
        const labels = {
          method: request.method,
          route: request.route,
          transport: request.transport,
          statusCode: extractStatusCode(error),
          status: error ? 'failed' : 'succeed',
        }
        console.log(labels)
        console.log(latency)

        console.log(metricMicrofleetDuration)
        metricMicrofleetDuration.observe(labels, latency)

        return [error, result]
      },
    },
  ]
}
