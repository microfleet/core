import { Microfleet, TransportTypes } from '../../';
declare type RequestCountRegistry = {
    [P in TransportTypes]: number;
};
export declare class RequestCountTracker {
    registry: RequestCountRegistry;
    service: Microfleet;
    constructor(service: Microfleet);
    /**
     * Wait requests finish for specified transport
     * @param transport
     */
    waitForRequestsToFinish(transport: TransportTypes): Promise<void>;
    /**
     * Increase request count for specified transport
     * @param transport
     */
    increase(transport: TransportTypes): void;
    /**
     * Decrease request count for specified transport
     * @param transport
     */
    decrease(transport: TransportTypes): void;
    get(transport: TransportTypes): number;
}
/**
 * Helper method. Checks if router plugin installed and waits processing requests.
 * @param service
 * @param transport
 */
export declare function waitForRequestsToFinish(service: Microfleet, transport: TransportTypes): Promise<void>;
/**
 * Helper method. Checks if router plugin installed and gets request count for `transport`.
 * @param service
 * @param transport
 */
export declare function getRequestCount(service: Microfleet, transport: TransportTypes): any;
export {};
