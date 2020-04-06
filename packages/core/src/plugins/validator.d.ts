import MicrofleetValidator from '@microfleet/validation';
import ajv from 'ajv';
import { Microfleet } from '../';
declare type Validator = MicrofleetValidator & {
    addLocation(location: string): void;
};
/**
 * Validator configuration, more details in
 * https://github.com/microfleet/validation
 */
export declare type ValidatorConfig = {
    schemas: string[];
    filter: ((filename: string) => boolean) | null;
    serviceConfigSchemaIds: string[];
    ajv: ajv.Options;
};
/**
 * Plugin name
 */
export declare const name = "validator";
/**
 * Defines service extension
 */
export interface ValidatorPlugin {
    validator: Validator & {
        addLocation(location: string): void;
    };
    validate: Validator['validate'];
    validateSync: Validator['validateSync'];
    ifError: Validator['ifError'];
}
/**
 * Plugin Type
 */
export declare const type: "essential";
/**
 * Relative priority inside the same plugin group type
 */
export declare const priority = 0;
/**
 * Attaches initialized validator based on conf.
 * Provides `validate` and `validateSync` methods.
 * @param conf - Validator Configuration Object.
 * @param parentFile - From which file this plugin was invoked.
 */
export declare const attach: (this: Microfleet, config: ValidatorConfig, parentFile: string) => void;
export {};
