import Bluebird = require('bluebird')
import { Microfleet, RouterPlugin } from '../../../'
import { ServiceRequestInterface } from '../../../types'
import moduleLifecycle from './lifecycle'

function handler(this: Microfleet & RouterPlugin, request: ServiceRequestInterface): Bluebird<any> {
  const { extensions } = this.router
  return moduleLifecycle('handler', request.action, extensions, [request], this)
}

export default handler
