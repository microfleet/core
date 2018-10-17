import Bluebird = require('bluebird')
import { ArgumentError, NotFoundError } from 'common-errors'
import _debug = require('debug')
import is = require('is')
import { Microfleet } from '../../../'
import { ServiceRequest } from '../../../types'
import moduleLifecycle from './lifecycle'

const debug = _debug('mservice:router:module:request')

function getAction(this: Microfleet, route: string, request: ServiceRequest) {
  debug('handler for module "request"')
  const service = this
  const { transport } = request

  if (is.undefined(transport)) {
    return Bluebird.reject(new ArgumentError('"request" must have property "transport"'))
  }

  const action = service.router.routes[transport][route]

  if (is.undefined(action)) {
    return Bluebird.reject(new NotFoundError(`route "${route}" not found`))
  }

  request.action = action
  request.route = route

  return Bluebird.resolve(request)
}

function requestHandler(this: Microfleet, route: string, request: ServiceRequest) {
  const service = this
  const { extensions } = service.router

  return moduleLifecycle('request', getAction, extensions, [route, request], service)
}

export default requestHandler
