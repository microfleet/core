import { Microfleet, ValidatorPlugin } from '@microfleet/core';
import pino from 'pino';
import pinoms from 'pino-multi-stream';
/**
 * Plugin Type
 */
export declare const type: "essential";
/**
 * Relative priority inside the same plugin group type
 */
export declare const priority = 10;
/**
 * Plugin Name
 */
export declare const name = "logger";
/**
 * Logger Plugin interface.
 */
export interface LoggerPlugin {
    log: pinoms.Logger;
}
export interface LoggerConfig {
    defaultLogger: any;
    prettifyDefaultLogger: boolean;
    debug: boolean;
    name: string;
    options: pino.LoggerOptions;
    streams: {
        [streamName: string]: pinoms.Streams;
    };
}
export declare const levels: string[];
export declare const isCompatible: (obj: any) => boolean;
/**
 * Plugin init function.
 * @param  opts - Logger configuration.
 */
export declare function attach(this: Microfleet & ValidatorPlugin, opts: Partial<LoggerConfig>): void;
