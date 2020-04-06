import { Microfleet, ValidatorPlugin } from '../';
/**
 * Plugin Name
 */
export declare const name = "cassandra";
/**
 * Plugin Type
 */
export declare const type: "database";
/**
 * Relative priority inside the same plugin group type
 */
export declare const priority = 0;
export declare function attach(this: Microfleet & ValidatorPlugin, params?: any): {
    close: (this: Microfleet) => Promise<void>;
    connect: (this: Microfleet) => Promise<any>;
};
