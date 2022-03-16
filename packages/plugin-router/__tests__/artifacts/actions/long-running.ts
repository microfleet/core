import { delay } from 'bluebird'
import { Microfleet } from '@microfleet/core'
import { ServiceRequest } from '@microfleet/plugin-router'

export default async function longAction(this: Microfleet, request: ServiceRequest): Promise<any> {
  const { params } = request
  const delayFromRequest = params.pause || 100

  this.log.debug({ params, msg: request.transportRequest.properties }, 'got params')

  return delay(delayFromRequest).then(() => {
    this.log.debug('delayed response', { params })

    return {
      success: true,
      params,
    }
  })
}
