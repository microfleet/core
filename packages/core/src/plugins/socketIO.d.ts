import { Microfleet, ValidatorPlugin } from '../';
declare function attachSocketIO(this: Microfleet & ValidatorPlugin, opts?: any): {
    getRequestCount: () => any;
};
/**
 * Relative priority inside the same plugin group type
 */
export declare const priority = 100;
export declare const attach: typeof attachSocketIO;
export declare const name = "socketIO";
export declare const type: "transport";
export {};
