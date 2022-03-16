import { ClientRequest } from 'http'
import { Span, SpanContext } from 'opentracing'
import { Microfleet } from '@microfleet/core'
import { Logger } from '@microfleet/plugin-logger'
import { RequestDataKey, ActionTransport } from '../router'

export type ServiceMiddleware = (this: Microfleet, request: ServiceRequest) => Promise<void>
export type ServiceActionHandler<R = unknown> = (this: Microfleet, request: ServiceRequest, ...params: any) => Promise<R>
export type ServiceActionAuthGetName = (request: ServiceRequest) => string

export interface ServiceAction<R = unknown> extends ServiceActionHandler<R> {
  actionName: string
  transports: ServiceRequest['transport'][]
  transportOptions?: TransportOptions
  validateResponse: boolean
  schema?: string | null | boolean
  responseSchema?: string;
  readonly?: boolean
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface TransportOptions {}

export interface ServiceRequest<R = unknown> {
  route: string
  action: ServiceAction<R>
  params: any
  headers: any
  query: any
  method: keyof typeof RequestDataKey
  transport: typeof ActionTransport[keyof typeof ActionTransport]
  transportRequest: any | ClientRequest
  locals: any
  parentSpan: SpanContext | null
  span: Span | null
  log: Logger
  response?: unknown
  error?: any
  reformatError: boolean
}
