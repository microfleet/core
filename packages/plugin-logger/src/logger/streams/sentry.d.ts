import * as Sentry from '@sentry/node';
import pino = require('pino');
/**
 * Sentry stream for Pino
 */
declare class SentryStream {
    private release;
    private env?;
    private modules?;
    readonly [pino.symbols.needsMetadataGsym]: boolean;
    constructor(opts: any);
    /**
     * Method call by Pino to save log record
     * msg is a stringified set of data
     */
    write(msg: string): boolean;
    /**
     * Error deserialiazing function. Bunyan serialize the error to object:
     * https://github.com/trentm/node-bunyan/blob/master/lib/bunyan.js#L1089
     * @param  {object} data serialized Bunyan
     * @return {Error}      the deserialiazed error
     */
    deserializeError(data: any): any;
    /**
     * Convert Bunyan level number to Sentry level label.
     * Rule : >50=error ; 40=warning ; info otherwise
     */
    getSentryLevel(level: number): Sentry.Severity;
}
declare function sentryStreamFactory(config: Sentry.NodeOptions): {
    level: string | import("@sentry/types").LogLevel.Error | import("@sentry/types").LogLevel.Debug | import("@sentry/types").LogLevel.Verbose;
    stream: SentryStream;
};
export default sentryStreamFactory;
