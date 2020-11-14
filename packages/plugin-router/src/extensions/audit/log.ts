import { Microfleet } from '@microfleet/core'

import { RouterLifecycleExtension } from '../../types/plugin'
import Lifecycle from '../../lifecycle'
import { getInitTimingExtension, ServiceRequestWithStart } from '../utils'

export type AuditLogExtensionParams = {
  disableLogErrorsForNames?: string[]
}

export type MetaLog = {
  headers: any
  latency: number
  method: string
  params: any
  query: any
  route: string
  transport: string
  response?: any
  err?: Error
}

export default function auditLogFactory(params: AuditLogExtensionParams = {}): RouterLifecycleExtension {
  const disableLogErrorsForNames: string[] = params.disableLogErrorsForNames || []

  return [
    getInitTimingExtension(),
    {
      point: Lifecycle.points.preResponse,
      async handler(this: Microfleet, request: ServiceRequestWithStart) {
        const { started, error, response } = request
        const execTime = request.executionTotal = process.hrtime(started)

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
          request.log[level](meta, 'Error performing operation %s', err)
        } else {
          if (this.config.debug) {
            meta.response = response
          }

          request.log.info(meta, 'completed operation %s', request.action.actionName)
        }
      },
    },
  ]
}
