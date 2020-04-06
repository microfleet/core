"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const retry = require("bluebird-retry");
const Bluebird = require("bluebird");
const Errors = require("common-errors");
const Elasticsearch = require("elasticsearch");
const common_errors_1 = require("common-errors");
const constants_1 = require("../constants");
/**
 * Relative priority inside the same plugin group type
 */
exports.priority = 0;
exports.name = 'elasticsearch';
exports.type = constants_1.PluginTypes.database;
function attach(params = {}) {
    assert(this.hasPlugin('logger'), new common_errors_1.NotFoundError('logger module must be included'));
    assert(this.hasPlugin('validator'), new common_errors_1.NotFoundError('validator module must be included'));
    const conf = this.validator.ifError('elasticsearch', params);
    const { log, ...opts } = conf;
    const { log: serviceLogger } = this;
    let Logger = null;
    if (log && log.type === 'service') {
        Logger = {
            debug: serviceLogger.debug.bind(serviceLogger),
            error: serviceLogger.error.bind(serviceLogger),
            info: serviceLogger.info.bind(serviceLogger),
            warning: serviceLogger.warn.bind(serviceLogger),
            trace(method, requestUrl, body, responseBody, responseStatus) {
                serviceLogger.trace({
                    body,
                    method,
                    requestUrl,
                    responseBody,
                    responseStatus,
                });
            },
            close() { return; },
        };
    }
    return {
        /**
         * @returns Elasticsearch connection.
         */
        async connect() {
            assert(!this.elasticsearch, new Errors.NotPermittedError('elasticsearch was already started'));
            const instance = new Elasticsearch.Client({
                ...opts,
                defer() { return Bluebird.defer(); },
                log: Logger || log,
            });
            await retry(instance.nodes.info, {
                context: instance.nodes,
                args: [{ nodeId: '', human: true }],
                interval: 500,
                backoff: 2,
                // eslint-disable-next-line @typescript-eslint/camelcase
                max_interval: 5000,
                timeout: 60000,
                // eslint-disable-next-line @typescript-eslint/camelcase
                max_tries: 100,
            });
            this.elasticsearch = instance;
            this.emit('plugin:connect:elasticsearch', instance);
            return instance;
        },
        /**
         * @returns Closes elasticsearch connection.
         */
        async close() {
            await Bluebird.try(() => this.elasticsearch.close());
            this.elasticsearch = null;
            this.emit('plugin:close:elasticsearch');
        },
    };
}
exports.attach = attach;
//# sourceMappingURL=elasticsearch.js.map