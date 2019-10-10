import { Microfleet, ActionTransport, TransportTypes } from '../../'

const eventToPromise = require('event-to-promise')

type RequestCountRegistry = {
  [P in TransportTypes]: number
}

export interface RequestCountTracker {
  increase: (transport: TransportTypes) => void,
  decrease: (transport: TransportTypes) => void,
  get: (transport: TransportTypes) => number,
  waitForRequestsToFinish: (transport: TransportTypes) => Promise<any> | void,
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

export default function getRequestCountTracker(service: Microfleet): RequestCountTracker {
  const registry:RequestCountRegistry = Object.create(null)
  const availableTransports = Object.values(ActionTransport)

  for (const transport of availableTransports) {
    registry[transport] = 0
  }

  return {
    /**
     * Wait requests finish for specified transport
     * @param transport
     */
    waitForRequestsToFinish: (transport: TransportTypes): Promise<any> => {
      const event = `plugin:drain:${transport}`
      if (!registry[transport]) {
        return Promise.resolve()
      }
      return eventToPromise(service as any, event)
    },

    /**
     * Increase request count for specified transport
     * @param transport
     */
    increase: (transport: TransportTypes) => {
      registry[transport] += 1
    },

    /**
     * Decrease request count for specified transport
     * @param transport
     */
    decrease: (transport: TransportTypes) => {
      if ((registry[transport] || 0) - 1 < 0) {
        throw new RangeError('request count is out of bounds')
      }

      registry[transport] -= 1
      if (service.stopping && !registry[transport]) {
        service.emit(`plugin:drain:${transport}`)
      }
    },

    get: (transport: TransportTypes) => registry[transport],
  }
}
