import { Microfleet, RouterPlugin, ValidatorPlugin } from '..';
/**
 * Plugin Name
 */
export declare const name = "prometheus";
/**
 * Plugin Type
 */
export declare const type: "application";
/**
 * Relative priority inside the same plugin group type
 */
export declare const priority = 50;
/**
 * Attaches plugin to the MService class.
 * @param settings - prometheus settings
 */
export declare function attach(this: Microfleet & RouterPlugin & ValidatorPlugin, opts?: any): {
    connect(): Promise<void>;
    close(): Promise<void>;
};
