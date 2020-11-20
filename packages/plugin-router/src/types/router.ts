import { ClientRequest } from 'http'
import { Microfleet } from '@microfleet/core'
import { Logger } from '@microfleet/plugin-logger'

import Router from '../router'

export type ServiceActionHandler = <T>(this: Microfleet, request: ServiceRequest, ...params: any[]) => PromiseLike<T>
export type ServiceActionAuthGetName = (request: ServiceRequest) => string
export type DispatchCallback = (err: any, result?: any) => void

// @todo types and documentation
export interface ServiceRequest {
  route: string
  params: any
  headers: any
  query: any
  method: keyof typeof Router.RequestDataKey
  transport: typeof Router.ActionTransport[keyof typeof Router.ActionTransport]
  transportRequest: any | ClientRequest
  action: ServiceAction
  locals: any
  auth?: any
  socket?: NodeJS.EventEmitter
  parentSpan: any
  span: any
  log: Logger
  error?: any
  response?: unknown
}

export interface ServiceAction extends ServiceActionHandler {
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
