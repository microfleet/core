import is = require('is')
import { Microfleet } from '../../../..'
import { MserviceError } from '../../../../types'
import { LifecyclePoints, ExtensionPlugin } from '..'
import { storeRequestTimeFactory, ServiceRequestWithStart } from '../sharedHandlers'

export type AuditLogExtensionParams = {
  disableLogErrorsForNames?: string[];
}

export type MetaLog = {
  headers: any;
  latency: number;
  method: string;
  params: any;
  query: any;
  route: string;
  transport: string;
  response?: any;
  err?: Error;
}

export default function auditLogFactory(params: AuditLogExtensionParams = {}): ExtensionPlugin[] {
  const disableLogErrorsForNames: string[] = params.disableLogErrorsForNames || []

  return [
    storeRequestTimeFactory(),
    {
      point: LifecyclePoints.preResponse,
      async handler(this: Microfleet, error: MserviceError | void, result: any, request: ServiceRequestWithStart) {
        const execTime = request.executionTotal = process.hrtime(request.started)

        const meta: MetaLog = {
          headers: request.headers,
          latency: (execTime[0] * 1000) + (+(execTime[1] / 1000000).toFixed(3)),
          method: request.method,
          params: request.params,
          query: request.query,
          route: request.route,
          transport: request.transport,
          response: undefined,
        }

        if (error) {
          const err = is.fn(error.toJSON) ? error.toJSON() : error.toString()
          const isCodeLevelInfo = (error.statusCode && error.statusCode < 400)
            || (error.name && disableLogErrorsForNames.includes(error.name))
          const level = isCodeLevelInfo ? 'info' : 'error'

          meta.err = error
          // just pass data through
          request.log[level](meta, 'Error performing operation', err)
        } else {
          if (this.config.debug) {
            meta.response = result
          }

          request.log.info(meta, 'completed operation', request.action.actionName)
        }

        return [error, result]
      },
    },
  ]
}
