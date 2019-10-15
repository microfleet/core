import { Microfleet, ActionTransport, TransportTypes } from '../../'

const eventToPromise = require('event-to-promise')

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
    if (!this.registry[transport]) {
      return Promise.resolve()
    }
    return eventToPromise(this.service, event)
  }

  /**
   * Increase request count for specified transport
   * @param transport
   */
  increase(transport: TransportTypes) {
    this.registry[transport] += 1
  }

  /**
   * Decrease request count for specified transport
   * @param transport
   */
  decrease(transport: TransportTypes) {
    if ((this.registry[transport]) - 1 < 0) {
      throw new RangeError('request count is out of bounds')
    }

    this.registry[transport] -= 1
    if (!this.registry[transport]) {
      this.service.emit(`plugin:drain:${transport}`)
    }
  }

  get(transport: TransportTypes) {
    return this.registry[transport]
  }
}

/**
 * Helper method. Checks if router plugin installed and waits processing requests.
 * @param service
 * @param transport
 */
export async function waitForRequestsToFinish(service: Microfleet, transport: TransportTypes) {
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
export function getRequestCount(service: Microfleet, transport: TransportTypes) {
  if (service.hasPlugin('router')) {
    const { requestCountTracker } = service.router
    return requestCountTracker.get(transport)
  }
  return 0
}
