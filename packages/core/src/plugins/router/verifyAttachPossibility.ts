import { NotFoundError, NotSupportedError } from 'common-errors'
import is = require('is')
import type { TransportTypes } from '@microfleet/core-types'
import { Router } from './factory'

/**
 * Verifies if it's possible to attach router for specific transport.
 * @param  router - Existing router instance.
 * @param  transportName - Transport name to attach handler to.
 */
export function verifyAttachPossibility(router: Router, transportName: TransportTypes): void {
  if (!is.object(router)) {
    throw new NotFoundError('Module "router" not included')
  }

  const routesConfig = router.config.routes

  if (!routesConfig.transports.includes(transportName)) {
    throw new NotSupportedError(`${transportName} not in "router" module config`)
  }
}
