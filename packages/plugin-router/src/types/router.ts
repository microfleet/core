import { ClientRequest } from 'http'
import { Span } from 'opentracing'
import { Microfleet } from '@microfleet/core'
import { Logger } from '@microfleet/plugin-logger'

import Router from '../router'
import { RunnerParams } from '../runner'

export type ServiceFn<R = void> = (this: Microfleet, request: ServiceRequest, ...params: any[]) => Promise<R>
export type ServiceActionAuthGetName = (request: ServiceRequest) => string
// export type DispatchCallback = (err: any, result?: any) => void

// @todo types and documentation
export interface ServiceRequest extends RunnerParams {
  route: string
  params: any
  headers: any
  query: any
  method: keyof typeof Router.RequestDataKey
  transport: typeof Router.ActionTransport[keyof typeof Router.ActionTransport]
  transportRequest: any | ClientRequest
  action: ServiceAction<any>
  locals: any
  auth?: any
  // @todo to socketio plugin
  socket?: NodeJS.EventEmitter
  parentSpan: any
  span?: Span
  log: Logger
  response?: unknown
  reformatError: boolean
}

export interface ServiceAction<R = unknown> extends ServiceFn<R> {
  actionName: string
  transports: ServiceRequest['transport'][]
  validateResponse: boolean
  allowed?: (this: Microfleet, request: ServiceRequest) => boolean | Promise<boolean>
  auth?: string | ServiceActionAuthGetName | ServiceActionAuthConfig
  passAuthError?: boolean
  schema?: string | null | boolean
  responseSchema?: string;
  readonly?: boolean
}

export interface ServiceActionAuthConfig {
  name: string
  passAuthError?: boolean
  strategy?: 'required' | 'try'
}
