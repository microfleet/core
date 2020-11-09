import type { Microfleet, TransportTypes } from '@microfleet/core-types'
import { ActionTransport } from '@microfleet/utils'
import { once } from 'events'

type RequestCountRegistry = {
  [P in TransportTypes]: number
}

export class RequestCountTracker {
  registry: RequestCountRegistry
  service: Microfleet

  constructor(service: Microfleet) {
    this.registry = Object.create(null)
    const availableTransports = Object.values(ActionTransport)

    this.service = service

    for (const transport of availableTransports) {
      this.registry[transport] = 0
    }
  }

  /**
   * Wait requests finish for specified transport
   * @param transport
   */
  async waitForRequestsToFinish(transport: TransportTypes): Promise<void> {
    const event = `plugin:drain:${transport}`
    if (this.registry[transport] === 0) {
      return
    }

    await once(this.service as any, event)
  }

  /**
   * Increase request count for specified transport
   * @param transport
   */
  increase(transport: TransportTypes): void {
    this.registry[transport] += 1
  }

  /**
   * Decrease request count for specified transport
   * @param transport
   */
  decrease(transport: TransportTypes): void {
    const { registry } = this
    registry[transport] -= 1

    if (registry[transport] === 0) {
      this.service.emit(`plugin:drain:${transport}`)
    }
  }

  get(transport: TransportTypes): number {
    return this.registry[transport]
  }
}

/**
 * Helper method. Checks if router plugin installed and waits processing requests.
 * @param service
 * @param transport
 */
export async function waitForRequestsToFinish(service: Microfleet, transport: TransportTypes): Promise<void> {
  if (service.hasPlugin('router')) {
    const { requestCountTracker } = service.router
    await requestCountTracker.waitForRequestsToFinish(transport)
  }
}

/**
 * Helper method. Checks if router plugin installed and gets request count for `transport`.
 * @param service
 * @param transport
 */
export function getRequestCount(service: Microfleet, transport: TransportTypes): number {
  if (service.hasPlugin('router')) {
    const { requestCountTracker } = service.router
    return requestCountTracker.get(transport)
  }
  return 0
}
