import { ClientRequest } from 'http'
import type { Span } from 'opentracing'
import { Microfleet } from '@microfleet/core'
import type { Logger as MicrofleetLoggerInstance } from '@microfleet/plugin-logger'
import type * as http from 'http'
import type * as https from 'https'
import type * as http2 from 'http2'
import { RequestDataKey, ActionTransport } from '../router'

export type RequestBodyDefault = unknown
export type RequestQuerystringDefault = unknown
export type RequestParamsDefault = unknown
export type RequestHeadersDefault = unknown
export type ReplyDefault = unknown

/**
 * A union type of the Node.js server types from the http, https, and http2 modules.
 */
export type RawServerBase = http.Server | https.Server | http2.Http2Server | http2.Http2SecureServer

/**
 * The default server type
 */
export type RawServerDefault = http.Server

/**
 * The default request type based on the server type. Utilizes generic constraining.
 */
export type RawRequestDefaultExpression<
  RawServer extends RawServerBase = RawServerDefault
  > = RawServer extends http.Server | https.Server ? http.IncomingMessage
  : RawServer extends http2.Http2Server | http2.Http2SecureServer ? http2.Http2ServerRequest
  : never

export interface RequestGenericInterface {
  Body?: RequestBodyDefault;
  Querystring?: RequestQuerystringDefault;
  Params?: RequestParamsDefault;
  Headers?: RequestHeadersDefault;
}

export type ServiceMiddleware = (this: Microfleet, request: ServiceRequest) => Promise<void>
export type ServiceActionAuthGetName = (request: ServiceRequest) => string

export interface ServiceAction<
  RouteGeneric extends RouteGenericInterface = RouteGenericInterface,
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
> {
  (this: Microfleet, request: ServiceRequest<RouteGeneric, RawServer, RawRequest>): Promise<Reply>
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

export interface ReplyGenericInterface {
  Reply?: ReplyDefault;
}

export interface RouteGenericInterface extends RequestGenericInterface, ReplyGenericInterface { }

/**
 * FastifyRequest is an instance of the standard http or http2 request objects.
 * It defaults to http.IncomingMessage, and it also extends the relative request object.
 */
export interface ServiceRequest<
  RouteGeneric extends RouteGenericInterface = RouteGenericInterface,
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  > {
  id: any;
  params: RouteGeneric['Params'];
  query: RouteGeneric['Querystring'];
  headers: RawRequest['headers'] & RouteGeneric['Headers']; // this enables the developer to extend the existing http(s|2) headers list
  body: RouteGeneric['Body'];
  log: MicrofleetLoggerInstance;
  route: string
  method: keyof typeof RequestDataKey
  transport: typeof ActionTransport[keyof typeof ActionTransport]
  transportRequest: any | ClientRequest
  locals: any
  parentSpan?: Span
  response?: unknown
  error?: any
  reformatError: boolean
  action: ServiceAction<R>
}
