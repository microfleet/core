import { Microfleet } from '@microfleet/core-types'
import type { ServiceRequest } from '../../types/router'
import { Lifecycle, LifecycleExtensions } from '../../lifecycle/index'
import { initTimingExtension } from './timing'

export type ErrorLevel = typeof ERROR_LEVEL_INFO
  | typeof ERROR_LEVEL_ERROR
  | typeof ERROR_LEVEL_WARN
  | typeof ERROR_LEVEL_DEBUG

export type AuditLogExtensionParams = {
  disableLogErrorsForNames?: string[]
  getErrorLevel?: (this: Microfleet, error: any) => ErrorLevel | undefined
}

export type MetaLog = {
  headers: Record<string, unknown>
  latency: number | null
  method: string
  params: any
  query: any
  route: string
  transport: string
  response?: any
  err?: Error
}

export const ERROR_LEVEL_INFO = 'info'
export const ERROR_LEVEL_ERROR = 'error'
export const ERROR_LEVEL_WARN = 'warn'
export const ERROR_LEVEL_DEBUG = 'debug'

const NS_PER_SEC = 1e9
const MS_PER_NS = 1e6

/**
* Get duration in milliseconds from two process.hrtime()
* @function hrTimeDurationInMs
* @param {Array} startTime - [seconds, nanoseconds]
* @param {Array} endTime - [seconds, nanoseconds]
* @returns {Number | Null} durationInMs
*/
export const hrTimeDurationInMs = (startTime?: [number, number], endTime?: [number, number]): number | null => {
  if (!Array.isArray(startTime) || !Array.isArray(endTime)) {
    return null
  }

  const secondDiff = endTime[0] - startTime[0]
  const nanoSecondDiff = endTime[1] - startTime[1]
  const diffInNanoSecond = secondDiff * NS_PER_SEC + nanoSecondDiff
  return Math.round(diffInNanoSecond / MS_PER_NS)
}

export default function auditLogFactory(params: AuditLogExtensionParams = {}): LifecycleExtensions {
  const { getErrorLevel } = params
  const disableLogErrorsForNames: string[] = params.disableLogErrorsForNames || []

  return [
    initTimingExtension,
    {
      point: Lifecycle.hooks.preResponse,
      async handler(this: Microfleet, request: ServiceRequest) {
        const { requestStarted, error, response } = request
        const requestEnded = request.requestEnded = process.hrtime()

        const meta: MetaLog = {
          headers: request.headers,
          latency: hrTimeDurationInMs(requestStarted, requestEnded),
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
            meta.response = response
          }

          request.log.info(meta, 'completed operation %s', request.action.actionName)
        }
      },
    },
  ]
}
