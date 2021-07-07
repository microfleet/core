import { ServiceAction } from './types/router'

export type RouteName = string
export type TransportName = string
export type RoutesCollection = Map<RouteName, ServiceAction>
export type RoutesGroupedByTransport = Map<TransportName, RoutesCollection>
export default class Routes {
  protected groupedByTransport: RoutesGroupedByTransport = new Map()

  get(transport: TransportName): RoutesCollection {
    const { groupedByTransport } = this
    const routes: RoutesCollection = groupedByTransport.get(transport) || new Map()

    groupedByTransport.set(transport, routes)

    return routes
  }

  getAction(transport: TransportName, route: RouteName): ServiceAction | undefined {
    return this.groupedByTransport.get(transport)?.get(route)
  }

  add(transport: TransportName, route: RouteName, handler: ServiceAction): void {
    const { groupedByTransport } = this
    const routes: RoutesCollection = groupedByTransport.get(transport) || new Map()

    routes.set(route, handler)
    groupedByTransport.set(transport, routes)
  }
}
