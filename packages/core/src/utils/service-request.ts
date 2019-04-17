import { RequestMethods, TransportTypes, ResponseHeaders, ServiceRequestInterface } from '../types'
import { ClientRequest } from 'http'

export class ServiceRequest implements ServiceRequestInterface {
  route: string
  params: any
  headers: any
  query: any
  method: RequestMethods
  transport: TransportTypes
  transportRequest: any | ClientRequest
  action: any
  locals: any
  span: any
  parentSpan: any
  log: {
    trace(...args: any[]): void,
    debug(...args: any[]): void,
    info(...args: any[]): void,
    warn(...args: any[]): void,
    error(...args: any[]): void,
    fatal(...args: any[]): void
  }
  auth?: any
  socket?: NodeJS.EventEmitter
  responseHeaders: ResponseHeaders

  // todo change args order and structure
  constructor(
    route: string,
    params: any,
    headers: any,
    query: any,
    method: RequestMethods,
    transport: TransportTypes,
    transportRequest: any | ClientRequest,
    action: any,
    locals: any,
    span: any,
    parentSpan: any,
    log: {
      trace(...args: any[]): void,
      debug(...args: any[]): void,
      info(...args: any[]): void,
      warn(...args: any[]): void,
      error(...args: any[]): void,
      fatal(...args: any[]): void
    },
    auth?: any,
    socket?: NodeJS.EventEmitter
  ) {
    this.route = route
    this.params = params
    this.headers = headers
    this.query = query
    this.method = method
    this.transport = transport
    this.transportRequest = transportRequest
    this.action = action
    this.locals = locals
    this.span = span
    this.parentSpan = parentSpan
    this.log = log
    this.auth = auth
    this.socket = socket
    this.responseHeaders = {}
  }

  // todo: validate header title and value
  setResponseHeader = (title: string, value: string): void => {
    this.validateHeader(title, value)

    this.responseHeaders[title] = value
  }

  removeResponseHeader = (title: string): void => {
    delete this.responseHeaders[title]
  }

  getResponseHeaders = (): ResponseHeaders => {
    return this.responseHeaders
  }

  getResponseHeader = (title: string): string => {
    return this.responseHeaders[title]
  }

  // it's fake validation for now
  private validateHeader(title: string, value: string): void {
    if (!title.startsWith('x-')) {
      throw Error('Header should have a prefix value but I am not sure which one')
    }

    if (value === '') {
      throw Error('Value should not be an empty string')
    }
  }
}
