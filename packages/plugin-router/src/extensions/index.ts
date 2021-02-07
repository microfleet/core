import auditLog from './audit/log'
import auditMetrics from './audit/metrics'
import validateQueryStringParser from './validate/query-string-parser'
import validateTransportOptions from './validate/transport-options'

import Lifecycle from '../lifecycle/abstract'
import { ServiceFn } from '../types/router'

export type LifecycleExtensions = LifecycleExtension[]
export type LifecycleExtension = {
  point: keyof typeof Lifecycle.points
  handler: ServiceFn
}

export {
  auditLog,
  auditMetrics,
  validateQueryStringParser,
  validateTransportOptions,
}
