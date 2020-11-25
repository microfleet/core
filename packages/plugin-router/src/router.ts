import { strict as assert } from 'assert'
import { resolve } from 'path'
import * as Bluebird from 'bluebird'
import { Tags } from 'opentracing'
import { v4 as uuidv4 } from 'uuid'
import { Tracer } from 'opentracing'
import { Logger } from '@microfleet/plugin-logger'

import RequestCountTracker from './tracker'
import Routes from './routes'
import Lifecycle from './lifecycle/abstract'
import { ServiceAction, ServiceRequest } from './types/router'
import {
  readRoutes,
  createServiceAction,
  requireServiceActionHandler,
} from './utils'

const { COMPONENT, ERROR } = Tags

export type RouterOptions = {
  lifecycle: Lifecycle
  routes: Routes<any>
  requestCountTracker: RequestCountTracker
  log: Logger
  config?: RouterConfig
  tracer?: Tracer
}

export type RouterConfig = {
  directory?: string
  enabled?: Record<string, string>
  prefix?: string
  enabledGenericActions?: string[]
}

const finishSpan = ({ span }: ServiceRequest) => () => {
  if (span !== undefined) {
    span.finish()
  }
}
const spanLog = (request: ServiceRequest) => (error: any) => {
  if (request.span !== undefined ) {
    request.span.setTag(ERROR, true)
    request.span.log({
      'error.object': error,
      event: 'error',
      message: error.message,
      stack: error.stack,
    })
  }

  throw error
}

export default class Router {
  // Constants with possilble transport values
  static readonly ActionTransport = {
    amqp: 'amqp',
    http: 'http',
    internal: 'internal',
    socketio: 'socketio',
  } as const

  // todo to validation
  // based on this we validate input data
  static readonly RequestDataKey = {
    amqp: 'params',
    delete: 'query',
    get: 'query',
    head: 'query',
    options: 'query',
    internal: 'params',
    patch: 'params',
    post: 'params',
    put: 'params',
    socketio: 'params',
  } as const

  public readonly config?: RouterConfig
  public readonly routes: Routes<ServiceAction>
  public readonly requestCountTracker: RequestCountTracker

  protected readonly lifecycle: Lifecycle
  protected readonly log: Logger
  protected readonly prefix?: string
  protected readonly tracer?: Tracer

  constructor({ lifecycle, routes, config, requestCountTracker, log, tracer }: RouterOptions) {
    this.lifecycle = lifecycle
    this.routes = routes
    this.config = config
    this.requestCountTracker = requestCountTracker
    this.log = log
    this.tracer = tracer

    if (config !== undefined) {
      const { directory, enabledGenericActions, prefix } = config

      if (prefix !== undefined && prefix.length > 0) {
        this.prefix = prefix
      }

      if (directory !== undefined) {
        this.loadActionsFromDirectory(directory)
      }

      if (enabledGenericActions !== undefined) {
        this.loadGenericActions(enabledGenericActions)
      }
    }
  }

  public prefixRoute(route: string): string {
    const { prefix } = this

    if (prefix !== undefined) {
      return `${prefix}.${route}`
    }

    return route
  }

  public addRoute(route: string, handler: ServiceAction): void {
    const { routes, config } = this
    const action = createServiceAction(route, handler)
    let name: string = route

    if (config !== undefined && config.enabled !== undefined && Object.keys(config.enabled).length > 0) {
      name = config.enabled[route]

      if (name === undefined) {
        return
      }
    }

    for (const transport of (action.transports || Object.keys(Router.ActionTransport))) {
      routes.add(transport, this.prefixRoute(name), action)
    }
  }

  public loadGenericActions(enabled: string[]): void {
    for (const route of enabled) {
      const handler = requireServiceActionHandler(resolve(__dirname, `./actions/${route}`))

      this.addRoute(`generic.${route}`, handler)
    }
  }

  public loadActionsFromDirectory(directory: string): void {
    for (const [route, handler] of readRoutes(directory)) {
      this.addRoute(route, handler)
    }
  }

  public prefixAndDispatch(routeWithoutPrefix: string, request: ServiceRequest): Bluebird<any> {
    request.route = this.prefixRoute(routeWithoutPrefix)
    return this.dispatch(request)
  }

  public dispatch(request: ServiceRequest): Bluebird<any> {
    assert(request.route)
    assert(request.transport)

    const { route, transport } = request
    const { tracer, log, lifecycle } = this

    // @todo extension?
    // if we have installed tracer - init span
    if (tracer !== undefined) {
      request.span = tracer.startSpan(`dispatch:${route}`, {
        childOf: request.parentSpan,
        tags: {
          [COMPONENT]: request.transport,
        },
      })
    }

    request.action = this.routes.handler(transport, route) as ServiceAction
    request.log = log.child({
      reqId: uuidv4(),
    })

    return Bluebird
      .resolve(lifecycle.run(request))
      .catch(spanLog(request))
      .finally(finishSpan(request))
      .return(request)
      .get('response')
  }
}
