import { Microfleet, PluginInterface, ValidatorPlugin } from '../';
/**
 * Relative priority inside the same plugin group type
 */
export declare const priority = 0;
export declare const name = "elasticsearch";
export declare const type: "database";
export declare function attach(this: Microfleet & ValidatorPlugin, params?: any): PluginInterface;
