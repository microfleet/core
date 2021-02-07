import { strict as assert } from 'assert'

export type RouteName = string | symbol
export type RouteHandler = CallableFunction
export type RoutesMap = Map<RouteName, RouteHandler>
export type TransportName = string | symbol
export type TransportsMap = Map<TransportName, RoutesMap>

export default class Routes {
  protected transports: TransportsMap = new Map()

  get(route: RouteName, transport: TransportName): RouteHandler | undefined {
    assert(route !== undefined)
    assert(transport !== undefined)

    const routes = this.transports.get(transport)

    if (routes !== undefined) {
      return routes.get(route)
    }

    return undefined
  }

  add(route: RouteName, transport: TransportName, handler: RouteHandler): void {
    assert(route)
    assert(transport)

    const routes = this.transports.get(transport) || new Map()

    routes.set(route, handler)

    this.transports.set(transport, routes)
  }

  getForTransport(transport: TransportName): RoutesMap {
    return this.transports.get(transport) || new Map()
  }
}
