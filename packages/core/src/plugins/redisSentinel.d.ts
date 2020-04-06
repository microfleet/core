import { Microfleet, ValidatorPlugin } from '../';
/**
 * Plugin name.
 */
export declare const name = "redis";
/**
 * Plugin type.
 */
export declare const type: "database";
/**
 * Relative priority inside the same plugin group type
 */
export declare const priority = 0;
/**
 * Attaches Redis Sentinel plugin.
 * @param  [conf={}] - Configuration for Redis Sentinel Connection.
 * @returns Connections and Destructors.
 */
export declare function attach(this: Microfleet & ValidatorPlugin, opts?: any): {
    /**
     * @private
     * @returns Opens connection to Redis.
     */
    connect(this: Microfleet): Promise<any>;
    /**
     * @returns Returns current status of redis sentinel.
     */
    status: () => Promise<boolean>;
    /**
     * @returns Closes redis connection.
     */
    close(this: Microfleet): Promise<void>;
};
