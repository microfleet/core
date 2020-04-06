/// <reference types="node" />
/**
 * Pretty printing for Pino logger
 * NOTE: not for production use
 */
import { Writable } from 'stream';
declare function prettyStreamFactory(config: any): {
    level: any;
    stream: Writable;
};
export default prettyStreamFactory;
