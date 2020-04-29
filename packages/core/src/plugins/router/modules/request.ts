import Bluebird = require('bluebird')
import { ArgumentError, NotFoundError, HttpStatusError } from 'common-errors'
import _debug = require('debug')
import is = require('is')
import { Microfleet, RouterPlugin } from '../../../'
import { ServiceRequestInterface } from '../../../types'
import moduleLifecycle from './lifecycle'

const debug = _debug('mservice:router:module:request')

function getAction(this: Microfleet & RouterPlugin, route: string, request: ServiceRequestInterface) {
  debug('handler for module "request"')
  const { transport } = request

  if (is.undefined(transport)) {
    return Bluebird.reject(new ArgumentError('"request" must have property "transport"'))
  }

  const action = this.router.routes[transport][route]

  if (!is.fn(action)) {
    return Bluebird.reject(new NotFoundError(`route "${route}" not found`))
  }

  request.action = action
  request.route = route

  const { maintenanceMode } = this.config
  if (maintenanceMode && !action.readonly) {
    return Bluebird.reject(new HttpStatusError(418, 'Server Maintenance'))
  }

  return request
}

function requestHandler(this: Microfleet & RouterPlugin, route: string, request: ServiceRequestInterface) {
  const { extensions } = this.router

  return moduleLifecycle('request', getAction, extensions, [route, request], this)
}

export default requestHandler
