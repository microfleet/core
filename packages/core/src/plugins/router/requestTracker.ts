import { Microfleet } from '../../'

const eventToPromise = require('event-to-promise')

interface RequestCountRegistry {
  [transport: string]: number,
}

export interface RequestCountTracker {
  increase: (transport: string) => void,
  decrease: (transport: string) => void,
  get: (transport: string) => number,
  waitForRequests: (transport: string) => PromiseLike<any> | void,
}

/**
 * Helper method. Checks if router plugin installed and waits processing requests.
 * @param service
 * @param transport
 */
export async function waitForRequestsToFinish(service: Microfleet, transport: string) {
  if (service.hasPlugin('router')) {
    const { requestCountTracker } = service.router
    await requestCountTracker.waitForRequests(transport)
  }
}

/**
 * Helper method. Checks if router plugin installed and gets request count for `transport`.
 * @param service
 * @param transport
 */
export function getRequestCount(service: Microfleet, transport: string) {
  if (service.hasPlugin('router')) {
    const { requestCountTracker } = service.router
    return requestCountTracker.get(transport)
  }
  return 0
}

export default function getRequestCountTracker(service: Microfleet): RequestCountTracker {
  const registry:RequestCountRegistry = {}

  /**
   * Get request count for specified transport
   * @param transport
   */
  function requestCount(transport: string): number {
    return registry.hasOwnProperty(transport) ? registry[transport] : 0
  }

  return {
    /**
     * Wait requests finish for specified transport
     * @param transport
     */
    waitForRequests: (transport: string): PromiseLike<any> => {
      const event = `plugin:drain:${transport}`

      if (requestCount(transport) === 0) {
        return Promise.resolve()
      }
      return eventToPromise(service as any, event)
    },

    /**
     * Increase request count for specified transport
     * @param transport
     */
    increase: (transport:string) => {
      if (!registry.hasOwnProperty(transport)) {
        registry[transport] = 0
      }
      registry[transport] += 1
    },

    /**
     * Decrease request count for specified transport
     * @param transport
     */
    decrease: (transport:string) => {
      registry[transport] -= 1
      if (service.stopping && requestCount(transport) <= 0) {
        service.emit(`plugin:drain:${transport}`)
      }
    },

    get: requestCount,
  }
}
