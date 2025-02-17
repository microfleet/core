import { ClientRequest } from 'http'
import { Microfleet } from '@microfleet/core'
import { Logger } from '@microfleet/plugin-logger'
import { RequestDataKey, ActionTransport } from '../router'

export type ServiceMiddleware = (this: Microfleet, request: ServiceRequest) => Promise<void>
export type ServiceActionAuthGetName = (request: ServiceRequest) => string
export type ServiceActionHandler = ServiceAction['handler']


export interface RequestGenericInterface {
  Params?: unknown;
  Headers?: unknown;
  Querystring?: unknown;
  Locals?: unknown;
  TransportOptions?: unknown;
}

export interface ReplyGenericInterface {
  Reply?: unknown;
}
export interface ServiceAction<
  DefaultRequest extends RequestGenericInterface = RequestGenericInterface,
  DefaultReply extends ReplyGenericInterface = ReplyGenericInterface,
> {
  handler(this: Microfleet, request: ServiceRequest, ...params: any[]): Promise<DefaultReply["Reply"]>
  actionName: string
  transports: ServiceRequest['transport'][]
  transportOptions?: DefaultRequest["TransportOptions"]
  validateResponse: boolean
  schema?: string | null | boolean
  responseSchema?: string;
  readonly?: boolean
}

export interface ServiceRequest<
  DefaultRequest extends RequestGenericInterface = RequestGenericInterface,
  DefaultReply extends ReplyGenericInterface = ReplyGenericInterface,
  ErrorArg extends Error & { name: string, code?: string } = any
> {
  route: string
  action: ServiceAction<DefaultRequest, DefaultReply>
  params: DefaultRequest["Params"]
  headers: DefaultRequest["Headers"]
  query: DefaultRequest["Querystring"]
  method: keyof typeof RequestDataKey
  transport: typeof ActionTransport[keyof typeof ActionTransport]
  transportRequest: any | ClientRequest
  locals: DefaultRequest["Locals"]
  parentSpan: null
  span: null
  log: Logger
  response?: DefaultReply["Reply"]
  error?: ErrorArg
  reformatError: boolean
}
