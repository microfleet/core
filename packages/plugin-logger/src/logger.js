"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const core_1 = require("@microfleet/core");
const common_errors_1 = require("common-errors");
const pino_multi_stream_1 = require("pino-multi-stream");
const sonic_boom_1 = require("sonic-boom");
const every = require("lodash/every");
const prettyStreamFactory = require('./logger/streams/pretty').default;
const defaultConfig = {
    debug: false,
    defaultLogger: false,
    // there are no USER env variable in docker image
    // so we can set default value based on its absence
    // NOTE: not intended for production usage
    prettifyDefaultLogger: !(process.env.NODE_ENV === 'production' || !process.env.USER),
    name: 'mservice',
    streams: {},
    options: {
        redact: {
            paths: [
                'headers.cookie',
                'headers.authentication',
                'params.password',
            ],
        },
    },
};
function streamsFactory(streamName, options) {
    switch (streamName) {
        case 'sentry': {
            const sentryStreamFactory = require('./logger/streams/sentry').default;
            return sentryStreamFactory(options);
        }
        case 'pretty': {
            return prettyStreamFactory(options);
        }
        default:
            return options;
    }
}
/**
 * Plugin Type
 */
exports.type = core_1.PluginTypes.essential;
/**
 * Relative priority inside the same plugin group type
 */
exports.priority = 10;
/**
 * Plugin Name
 */
exports.name = 'logger';
exports.levels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
exports.isCompatible = (obj) => {
    return obj !== null
        && typeof obj === 'object'
        && every(exports.levels, (level) => typeof obj[level] === 'function');
};
/**
 * Plugin init function.
 * @param  opts - Logger configuration.
 */
function attach(opts) {
    const { config: { name: applicationName } } = this;
    assert(this.hasPlugin('validator'), new common_errors_1.NotFoundError('validator module must be included'));
    const config = this.validator.ifError('logger', opts);
    const { debug, defaultLogger, prettifyDefaultLogger, options, name: serviceName, streams: streamsConfig, } = Object.assign({}, defaultConfig, config);
    if (exports.isCompatible(defaultLogger)) {
        this.log = defaultLogger;
        return;
    }
    const streams = [];
    if (defaultLogger === true) {
        // return either human-readable logger or fast production-ready json logger
        const getDefaultStream = () => {
            if (prettifyDefaultLogger) {
                const { stream } = prettyStreamFactory({
                    translateTime: true,
                });
                return stream;
            }
            // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
            // @ts-ignore
            return new sonic_boom_1.default({ fd: process.stdout.fd });
        };
        streams.push({
            level: debug ? 'debug' : 'info',
            stream: getDefaultStream(),
        });
    }
    for (const [streamName, streamConfig] of Object.entries(streamsConfig)) {
        streams.push(streamsFactory(streamName, streamConfig));
    }
    this.log = pino_multi_stream_1.default({
        ...options,
        streams,
        name: applicationName || serviceName,
    });
}
exports.attach = attach;
//# sourceMappingURL=logger.js.map