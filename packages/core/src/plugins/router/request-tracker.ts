import { Microfleet } from '../../'

const eventToPromise = require('event-to-promise')

interface RequestCountRegistry {
  [transport: string]: number,
}

export interface RequestCountTracker {
  increase: (transport: string) => void,
  decrease: (transport: string) => void,
  get: (transport: string) => number,
  waitForRequestsToFinish: (transport: string) => PromiseLike<any> | void,
}

/**
 * Helper method. Checks if router plugin installed and waits processing requests.
 * @param service
 * @param transport
 */
export async function waitForRequestsToFinish(service: Microfleet, transport: string) {
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
export function getRequestCount(service: Microfleet, transport: string) {
  if (service.hasPlugin('router')) {
    const { requestCountTracker } = service.router
    return requestCountTracker.get(transport)
  }
  return 0
}

export default function getRequestCountTracker(service: Microfleet): RequestCountTracker {
  const registry:RequestCountRegistry = Object.create({})
  const { router: routerConfig } = service.config

  for (const transport of routerConfig.routes.transports) {
    registry[transport] = 0
  }

  return {
    /**
     * Wait requests finish for specified transport
     * @param transport
     */
    waitForRequestsToFinish: (transport: string): PromiseLike<any> => {
      const event = `plugin:drain:${transport}`
      if (registry[transport] === 0) {
        return Promise.resolve()
      }
      return eventToPromise(service as any, event)
    },

    /**
     * Increase request count for specified transport
     * @param transport
     */
    increase: (transport:string) => {
      registry[transport] += 1
    },

    /**
     * Decrease request count for specified transport
     * @param transport
     */
    decrease: (transport:string) => {
      if (registry[transport] - 1 < 0) {
        throw new RangeError('request count is out of bounds')
      }

      registry[transport] -= 1
      if (service.stopping && registry[transport] === 0) {
        service.emit(`plugin:drain:${transport}`)
      }
    },

    get: (transport: string) => registry[transport],
  }
}
