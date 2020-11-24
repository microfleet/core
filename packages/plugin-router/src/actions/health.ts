import { HttpStatusError } from 'common-errors'
import {
  Microfleet,
  HealthStatus,
  PLUGIN_STATUS_FAIL
} from '@microfleet/core'

import { ServiceRequest } from '../types/router'

const kUnhealthy = new HttpStatusError(500, 'unhealthy')

export default async function genericHealthCheck(this: Microfleet, request: ServiceRequest): Promise<{ data: HealthStatus }> {
  const data = await this.getHealthStatus()

  if (PLUGIN_STATUS_FAIL === data.status) {
    switch (request.transport) {
      case 'amqp':
      case 'internal': {
        const plugins = data.failed.map(it => it.name).join(', ')
        throw new HttpStatusError(500, `Unhealthy due to following plugins: ${plugins}`)
      }

      default:
        throw kUnhealthy
    }
  }

  return { data }
}
