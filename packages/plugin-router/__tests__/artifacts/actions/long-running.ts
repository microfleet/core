import { delay } from 'bluebird'
import { Microfleet, ServiceRequest } from '@microfleet/core'

export default async function longAction(this: Microfleet, request: ServiceRequest): Promise<any> {
  const { params } = request
  const delayFromRequest = params.pause || 100

  this.log.debug('got params', { params })

  return delay(delayFromRequest).then(() => {
    this.log.debug('delayed response', { params })

    return {
      success: true,
      params,
    }
  })
}
