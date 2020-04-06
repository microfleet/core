import { Microfleet, ValidatorPlugin } from '../';
/**
 * Plugin Name
 */
export declare const name = "amqp";
/**
 * Plugin Type
 */
export declare const type: "transport";
/**
 * Relative priority inside the same plugin group type
 */
export declare const priority = 0;
/**
 * Attaches plugin to the Mthis class.
 * @param {Object} config - AMQP plugin configuration.
 */
export declare function attach(this: Microfleet & ValidatorPlugin, opts?: any): {
    /**
     * Generic AMQP Connector.
     * @returns Opens connection to AMQP.
     */
    connect(this: Microfleet): Promise<any>;
    /**
     * Health checker.
     *
     * Returns true if connection state is 'open', otherwise throws an error.
     * Connection state depends on actual connection status, but it could be
     * modified when a heartbeat message from a message broker is missed during
     * a twice heartbeat interval.
     * @returns A truthy value if all checks are passed.
     */
    status(this: Microfleet): Promise<boolean>;
    getRequestCount(this: Microfleet): any;
    /**
     * Generic AMQP disconnector.
     * @returns Closes connection to AMQP.
     */
    close(this: Microfleet): Promise<void>;
};
