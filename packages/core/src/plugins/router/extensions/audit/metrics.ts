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
  return  error.statusCode || 400
}

function diffInMs(start: [number, number]): number {
  const execTime = process.hrtime(start)
  return (execTime[0] * 1000) + (+(execTime[1] / 1000000))
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

        const service = this
        if (service) {}

        const latency = diffInMs(request.metrics.start).toFixed()
        const labels = {
          method: request.method,
          route: request.route,
          transport: request.transport,
          status: extractStatusCode(error)
        }

        console.log('')
        console.log(labels)
        console.log(latency)

        return [error, result]
      },
    },
  ]
}
