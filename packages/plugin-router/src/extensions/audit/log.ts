import { Microfleet } from '@microfleet/core-types'
import type { ServiceRequest } from '../../types/router'
import { Lifecycle, LifecycleExtensions } from '../../lifecycle'
import { initTimingExtension } from './timing'

export type AuditLogExtensionParams = {
  disableLogErrorsForNames?: string[]
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
