"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Bluebird = require("bluebird");
const assert = require("assert");
const retry = require("bluebird-retry");
const common_errors_1 = require("common-errors");
const is = require("is");
const constants_1 = require("../constants");
const require_1 = require("../utils/require");
/**
 * Plugin Name
 */
exports.name = 'cassandra';
/**
 * Plugin Type
 */
exports.type = constants_1.PluginTypes.database;
/**
 * Relative priority inside the same plugin group type
 */
exports.priority = 0;
async function factory(Cassandra, config) {
    const { models } = config.service;
    const reconnectOpts = {
        interval: 500,
        backoff: 2,
        // eslint-disable-next-line @typescript-eslint/camelcase
        max_interval: 5000,
        timeout: 60000,
        // eslint-disable-next-line @typescript-eslint/camelcase
        max_tries: 100,
    };
    const reportError = (connect) => async () => {
        try {
            await connect();
        }
        catch (e) {
            this.log.warn({ err: e }, 'Failed to connect to cassandra');
            throw e;
        }
    };
    if (is.string(models)) {
        Cassandra.setDirectory(models);
        await retry(reportError(async () => Cassandra.bindAsync(config.client)), reconnectOpts);
        return Cassandra;
    }
    const client = Cassandra.createClient(config.client);
    await retry(reportError(async () => client.initAsync()), reconnectOpts);
    await Bluebird.mapSeries(Object.entries(models), ([modelName, model]) => {
        const Model = client.loadSchema(modelName, model);
        return Bluebird.fromCallback(next => Model.syncDB(next));
    });
    return client;
}
function attach(params = {}) {
    const Cassandra = require_1.default('express-cassandra');
    assert(this.hasPlugin('logger'), new common_errors_1.NotFoundError('log module must be included'));
    assert(this.hasPlugin('validator'), new common_errors_1.NotFoundError('validator module must be included'));
    const config = this.validator.ifError('cassandra', params);
    async function connectCassandra() {
        assert(!this.cassandra, new common_errors_1.NotPermittedError('Cassandra was already started'));
        const cassandra = await factory.call(this, Cassandra, config);
        this.cassandra = cassandra;
        this.emit('plugin:connect:cassandra', cassandra);
        return cassandra;
    }
    async function disconnectCassandra() {
        const { cassandra } = this;
        assert(cassandra, new common_errors_1.NotPermittedError('Cassandra was not started'));
        await cassandra.closeAsync();
        this.cassandra = null;
        this.emit('plugin:close:cassandra');
    }
    return {
        close: disconnectCassandra,
        connect: connectCassandra,
    };
}
exports.attach = attach;
//# sourceMappingURL=cassandra.js.map