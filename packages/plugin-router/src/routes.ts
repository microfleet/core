import { strict as assert } from 'assert'

export type RouteName = string
export type TransportName = string | symbol
export type RoutesCollection<T> = Map<RouteName, T>
export type TransportsCollection<T> = Map<TransportName, RoutesCollection<T>>

export default class Routes<T> {
  protected transports: TransportsCollection<T> = new Map()

  get(transport: TransportName): RoutesCollection<T> {
    assert(transport !== undefined)

    const routes = this.transports.get(transport)

    if (routes !== undefined) {
      return routes
    }

    const collection = new Map()

    this.transports.set(transport, collection)

    return collection
  }

  handler(transport: TransportName, route: RouteName): T | undefined {
    assert(route !== undefined)

    const routes = this.get(transport)

    return routes.get(route)
  }

  add(transport: TransportName, route: RouteName, handler: T): void {
    assert(transport)
    assert(route)

    const routes = this.get(transport)

    routes.set(route, handler)
  }
}
