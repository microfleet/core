"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require("../../");
const events_1 = require("events");
class RequestCountTracker {
    constructor(service) {
        this.registry = Object.create(null);
        const availableTransports = Object.values(__1.ActionTransport);
        this.service = service;
        for (const transport of availableTransports) {
            this.registry[transport] = 0;
        }
    }
    /**
     * Wait requests finish for specified transport
     * @param transport
     */
    async waitForRequestsToFinish(transport) {
        const event = `plugin:drain:${transport}`;
        if (this.registry[transport] === 0) {
            return;
        }
        await events_1.once(this.service, event);
    }
    /**
     * Increase request count for specified transport
     * @param transport
     */
    increase(transport) {
        this.registry[transport] += 1;
    }
    /**
     * Decrease request count for specified transport
     * @param transport
     */
    decrease(transport) {
        const { registry } = this;
        registry[transport] -= 1;
        if (registry[transport] === 0) {
            this.service.emit(`plugin:drain:${transport}`);
        }
    }
    get(transport) {
        return this.registry[transport];
    }
}
exports.RequestCountTracker = RequestCountTracker;
/**
 * Helper method. Checks if router plugin installed and waits processing requests.
 * @param service
 * @param transport
 */
async function waitForRequestsToFinish(service, transport) {
    if (service.hasPlugin('router')) {
        const { requestCountTracker } = service.router;
        await requestCountTracker.waitForRequestsToFinish(transport);
    }
}
exports.waitForRequestsToFinish = waitForRequestsToFinish;
/**
 * Helper method. Checks if router plugin installed and gets request count for `transport`.
 * @param service
 * @param transport
 */
function getRequestCount(service, transport) {
    if (service.hasPlugin('router')) {
        const { requestCountTracker } = service.router;
        return requestCountTracker.get(transport);
    }
    return 0;
}
exports.getRequestCount = getRequestCount;
//# sourceMappingURL=request-tracker.js.map