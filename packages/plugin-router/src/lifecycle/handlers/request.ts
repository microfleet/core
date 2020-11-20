import { Microfleet } from '@microfleet/core'
import { ArgumentError, NotFoundError, HttpStatusError } from 'common-errors'
import _debug = require('debug')

import { RouterPlugin } from '../../types/plugin'
import { ServiceRequest } from '../../types/router'

const debug = _debug('mservice:router:module:request')

async function requestHandler(this: Microfleet & RouterPlugin, request: ServiceRequest): Promise<void> {
  debug('handler for module "request"')

  const { transport, route } = request

  if (route === undefined) {
    throw new ArgumentError('"request" must have property "route"')
  }

  if (transport === undefined) {
    throw new ArgumentError('"request" must have property "transport"')
  }

  const action = this.router.getAction(route, transport)

  if (action === undefined) {
    throw new NotFoundError(`route "${route}" not found`)
  }

  request.action = action

  const { maintenanceMode } = this.config

  if (maintenanceMode && !action.readonly) {
    throw new HttpStatusError(418, 'Server Maintenance')
  }
}

export default requestHandler
