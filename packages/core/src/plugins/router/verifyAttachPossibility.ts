import { NotFoundError, NotSupportedError } from 'common-errors'
import is = require('is')
import { TransportTypes } from '../../types'
import { Router } from './factory'

/**
 * Verifies if it's possible to attach router for specific transport.
 * @param  router - Existing router instance.
 * @param  transportName - Transport name to attach handler to.
 */
function verifyAttachPossibility(router: Router, transportName: TransportTypes): void {
  if (!is.object(router)) {
    throw new NotFoundError('Module "router" not included')
  }

  const routesConfig = router.config.routes

  if (routesConfig.transports.includes(transportName) === false) {
    throw new NotSupportedError(`${transportName} not in "router" module config`)
  }
}

export default verifyAttachPossibility
