import Bluebird = require('bluebird')
import type { Microfleet, ServiceRequest } from '@microfleet/core-types'
import moduleLifecycle from './lifecycle'

function handler(this: Microfleet, request: ServiceRequest): Bluebird<any> {
  const { extensions } = this.router
  return moduleLifecycle('handler', request.action, extensions, [request], this)
}

export default handler
