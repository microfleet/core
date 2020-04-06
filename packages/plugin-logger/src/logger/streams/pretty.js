"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Pretty printing for Pino logger
 * NOTE: not for production use
 */
const stream_1 = require("stream");
const prettyFactory = require("pino-pretty");
// options: https://github.com/pinojs/pino-pretty#options
function prettyStreamFactory(config) {
    const { level, ...options } = config;
    const pretty = prettyFactory(options);
    const prettyStream = new stream_1.Writable({
        write(chunk, _, callback) {
            const line = pretty(chunk.toString());
            process.stdout.write(line, callback);
            callback();
        },
    });
    return {
        level: level || 'debug',
        stream: prettyStream,
    };
}
exports.default = prettyStreamFactory;
//# sourceMappingURL=pretty.js.map