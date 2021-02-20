import { Microfleet } from '@microfleet/core'
import { HttpStatusError, NotFoundError } from 'common-errors'
import { ServiceRequest } from '../../types/router'

async function requestHandler(this: Microfleet, request: ServiceRequest): Promise<void> {
  const { action, route } = request

  if (action === undefined) {
    // @todo HttpStatusError (there is a legacy code)
    throw new NotFoundError(`route "${route}" not found`)
  }

  const { maintenanceMode } = this.config

  if (maintenanceMode && !action.readonly) {
    throw new HttpStatusError(418, 'Server Maintenance')
  }
}

export default requestHandler
