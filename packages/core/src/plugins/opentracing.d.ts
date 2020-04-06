import { Microfleet, ValidatorPlugin } from '../';
/**
 * Plugin Name
 */
export declare const name = "opentracing";
/**
 * Plugin Type
 */
export declare const type: "essential";
/**
 * Relative priority inside the same plugin group type
 */
export declare const priority = 50;
/**
 * Attaches plugin to the MService class.
 * @param opts - AMQP plugin configuration.
 */
export declare function attach(this: Microfleet & ValidatorPlugin, opts?: any): void;
