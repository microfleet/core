import { Microfleet, ValidatorPlugin } from '../';
/**
 * Plugin Name
 */
export declare const name = "http";
/**
 * Plugin Type
 */
export declare const type: "transport";
/**
 * Relative priority inside the same plugin group type
 */
export declare const priority = 0;
/**
 * Attaches HTTP handler.
 * @param config - HTTP handler configuration to attach.
 */
export declare function attach(this: Microfleet & ValidatorPlugin, opts?: any): any;
