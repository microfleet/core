import { Microfleet } from '../../../..'
import { MserviceError } from '../../../../types'
import { LifecyclePoints, ExtensionPlugin } from '..'
import { storeRequestTimeFactory, ServiceRequestWithStart } from '../sharedHandlers'

export type ErrorLevel = typeof ERROR_LEVEL_INFO
 | typeof ERROR_LEVEL_ERROR
 | typeof ERROR_LEVEL_WARN
 | typeof ERROR_LEVEL_DEBUG

export type AuditLogExtensionParams = {
  disableLogErrorsForNames?: string[];
  getErrorLevel?: (this: Microfleet, error: any) => ErrorLevel;
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

export const ERROR_LEVEL_INFO = 'info'
export const ERROR_LEVEL_ERROR = 'error'
export const ERROR_LEVEL_WARN = 'warn'
export const ERROR_LEVEL_DEBUG = 'debug'

export default function auditLogFactory(params: AuditLogExtensionParams = {}): ExtensionPlugin[] {
  const { getErrorLevel } = params
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
          const err = typeof error.toJSON === 'function' ? error.toJSON() : error.toString()
          let level: ErrorLevel | undefined

          if (typeof getErrorLevel === 'function') {
            level = getErrorLevel.call(this, error)
          }

          if (level === undefined && error.statusCode && error.statusCode < 400) {
            level = ERROR_LEVEL_INFO
          }

          if (level === undefined && error.name && disableLogErrorsForNames.includes(error.name)) {
            level = ERROR_LEVEL_INFO
          }

          meta.err = error
          // just pass data through
          request.log[level || ERROR_LEVEL_ERROR](meta, 'Error performing operation %s', err)
        } else {
          if (this.config.debug) {
            meta.response = result
          }

          request.log.info(meta, 'completed operation %s', request.action.actionName)
        }

        return [error, result, request]
      },
    },
  ]
}
