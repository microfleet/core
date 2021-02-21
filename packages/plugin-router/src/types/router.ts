import { ClientRequest } from 'http'
import { Span } from 'opentracing'
import { Microfleet } from '@microfleet/core'
import { Logger } from '@microfleet/plugin-logger'

import Router from '../router'

export type ServiceMiddleware = (this: Microfleet, request: ServiceRequest) => Promise<void>
export type ServiceActionHandler<R = unknown> = (this: Microfleet, request: ServiceRequest, ...params: any) => Promise<R>
export type ServiceActionAuthGetName = (request: ServiceRequest) => string

export interface ServiceAction<R = unknown> extends ServiceActionHandler<R> {
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

export interface ServiceRequest {
  route: string
  action: ServiceAction
  params: any
  headers: any
  query: any
  method: keyof typeof Router.RequestDataKey
  transport: typeof Router.ActionTransport[keyof typeof Router.ActionTransport]
  transportRequest: any | ClientRequest
  locals: any
  auth?: any
  // @todo to socketio plugin
  // socket?: NodeJS.EventEmitter
  parentSpan: any
  span?: Span
  log: Logger
  response?: unknown
  error?: any
  reformatError: boolean
}
