import assert from 'node:assert/strict'
import hyperid from 'hyperid'
import { Logger } from '@microfleet/plugin-logger'
import { glob } from 'glob'

import RequestCountTracker from './tracker'
import Routes from './routes'
import { Lifecycle } from './lifecycle'
import { ServiceAction, ServiceRequest } from './types/router'
import { RouterPluginRoutesConfig } from './types/plugin'
import {
  readRoutes,
  createServiceAction,
  requireServiceActionHandler,
} from './utils'

export type RouterOptions = {
  lifecycle: Lifecycle
  routes: Routes
  requestCountTracker: RequestCountTracker
  log: Logger
  config?: RouterConfig
}

export type RouterConfig = RouterPluginRoutesConfig

// Constants with possilble transport values
// @TODO is it possible to config it from own transport plugin
export const ActionTransport = {
  amqp: 'amqp',
  http: 'http',
  internal: 'internal',
  socketio: 'socketio',
} as const

  // todo to validation
  // based on this we validate input data
export const RequestDataKey = {
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

export class Router {
  public readonly config?: RouterConfig
  public readonly routes: Routes
  public readonly requestCountTracker: RequestCountTracker

  public readonly lifecycle: Lifecycle
  protected readonly log: Logger
  protected readonly prefix?: string
  protected readonly idgen: hyperid.Instance
  protected readonly directory?: string
  protected readonly enabledGenericActions?: string[]

  constructor({ lifecycle, routes, config, requestCountTracker, log }: RouterOptions) {
    this.lifecycle = lifecycle
    this.routes = routes
    this.config = config
    this.requestCountTracker = requestCountTracker
    this.log = log
    this.idgen = hyperid()

    if (config !== undefined) {
      const { directory, enabledGenericActions, prefix } = config

      if (prefix !== undefined && prefix.length > 0) {
        this.prefix = prefix
      }

      this.directory = directory
      this.enabledGenericActions = enabledGenericActions
    }
  }

  public async ready(): Promise<void> {
    if (this.directory !== undefined) {
      await this.loadActionsFromDirectory(this.directory)
    }

    if (this.enabledGenericActions !== undefined) {
      await this.loadGenericActions(this.enabledGenericActions)
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
    let name: string = route

    if (config !== undefined) {
      if (config.disabled !== undefined && Object.keys(config.disabled).length > 0) {
        const disabledRoute = config.disabled[route]
        if (disabledRoute === route) {
          return
        }
      }

      // allows generic overwrites
      if (config.allRoutes) {
        Object.assign(handler, config.allRoutes)
      }

      if (config.enabled !== undefined && Object.keys(config.enabled).length > 0) {
        const updatedConfig = config.enabled[route]
        if (updatedConfig === undefined) {
          return
        }

        if (typeof updatedConfig === 'string') {
          name = updatedConfig
        } else {
          if (updatedConfig.config) Object.assign(handler, updatedConfig.config)
          if (updatedConfig.name) name = updatedConfig.name
        }
      }
    }

    const action = createServiceAction(route, handler)
    for (const transport of (action.transports || Object.keys(ActionTransport))) {
      routes.add(transport, this.prefixRoute(name), action)
    }
  }

  public async loadGenericActions(enabled: string[]): Promise<void> {
    const handlers = enabled.map(async (route) => {
      const serviceActions = await glob(`actions/${route}.{js,cjs,mjs,ts,cts,mts}`, {
        cwd: __dirname,
        absolute: true,
        ignore: ['*.d.ts', '**/*.d.ts', '*.d.mts', '**/*.d.mts', '*.d.cts', '**/*.d.cts']
      })

      assert(serviceActions.length > 0, `did not find ${route} action`)
      const [serviceAction] = serviceActions

      const handler = await requireServiceActionHandler(serviceAction)
      this.addRoute(`generic.${route}`, handler)
    })

    await Promise.all(handlers)
  }

  public async loadActionsFromDirectory(directory: string): Promise<void> {
    for (const [route, handler] of await readRoutes(directory)) {
      this.addRoute(route, handler)
    }
  }

  public async prefixAndDispatch(routeWithoutPrefix: string, request: ServiceRequest): Promise<any> {
    request.route = this.prefixRoute(routeWithoutPrefix)
    return this.dispatch(request)
  }

  public async dispatch(request: ServiceRequest): Promise<any> {
    assert(request.route)
    assert(request.transport)

    const { route, transport } = request
    const { log, lifecycle } = this

    // "as ServiceAction" is not ok, because getAction() result could be undefined
    // but there is a addition check for it in lifecycle/handlers/request
    // otherwise will be a lot of redundant asserts in other lifecycle handlers
    // maybe you can fix it using a typescript magic
    request.action = this.routes.getAction(transport, route) as ServiceAction
    request.log = log.child({
      reqId: this.idgen(),
    })

    await lifecycle.run(request)

    return request.response
  }
}

export default Router
