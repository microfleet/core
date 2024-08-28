import { ClientRequest } from 'http'
import { Span, SpanContext } from 'opentracing'
import { Microfleet } from '@microfleet/core'
import { Logger } from '@microfleet/plugin-logger'
import { RequestDataKey, ActionTransport } from '../router'
import { kReplyHeaders } from '../symbols'

export type ServiceMiddleware = (this: Microfleet, request: ServiceRequest) => Promise<void>
export type ServiceActionAuthGetName = (request: ServiceRequest) => string
export type ServiceActionHandler = ServiceAction['handler']

export interface ServiceAction<R = unknown> {
  handler(this: Microfleet, request: ServiceRequest, ...params: any[]): Promise<R>
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

export type ReplyHeaders = Map<string, string | Array<string>>
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
  error?: any | Error & { headers?: ReplyHeaders }
  reformatError: boolean
  [kReplyHeaders]: ReplyHeaders;
  hasReplyHeadersSupport(): boolean
  getReplyHeaders(): Map<string, string | Array<string>>
  getReplyHeader(title: string): string | Array<string> | undefined
  hasReplyHeader(title: string): boolean
  setReplyHeader(title: string, value: string | Array<string>): ServiceRequest
  removeReplyHeader(title: string): ServiceRequest
  isValidReplyHeader(title: string, value: string | Array<string>): boolean
  clearReplyHeaders(): ServiceRequest
}

export interface DispatchOptions {
  simpleResponse: boolean
}
