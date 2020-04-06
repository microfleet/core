"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const Bluebird = require("bluebird");
const _debug = require("debug");
const __1 = require("../");
const require_1 = require("../utils/require");
const constants_1 = require("./redis/constants");
const common_errors_1 = require("common-errors");
const migrate_1 = require("./redis/migrate");
const utils_1 = require("./redis/utils");
const debug = _debug('mservice:redisSentinel');
/**
 * Plugin name.
 */
exports.name = 'redis';
/**
 * Plugin type.
 */
exports.type = __1.PluginTypes.database;
/**
 * Relative priority inside the same plugin group type
 */
exports.priority = 0;
/**
 * Attaches Redis Sentinel plugin.
 * @param  [conf={}] - Configuration for Redis Sentinel Connection.
 * @returns Connections and Destructors.
 */
function attach(opts = {}) {
    const Redis = require_1.default('ioredis');
    assert(this.hasPlugin('validator'), new common_errors_1.NotFoundError('validator module must be included'));
    Redis.Promise = Bluebird;
    const isRedisStarted = utils_1.isStarted(this, Redis);
    const conf = this.validator.ifError('redisSentinel', opts);
    return {
        /**
         * @private
         * @returns Opens connection to Redis.
         */
        async connect() {
            assert(this.redis == null, constants_1.ERROR_ALREADY_STARTED);
            const instance = new Redis({
                lazyConnect: true,
                name: conf.name,
                sentinels: conf.sentinels,
                ...conf.options,
            });
            if (this.tracer) {
                const applyInstrumentation = require_1.default('opentracing-js-ioredis');
                applyInstrumentation(this.tracer, instance);
            }
            // attach to instance right away
            if (conf.luaScripts) {
                debug('attaching lua');
                await utils_1.loadLuaScripts(this, conf.luaScripts, instance);
            }
            await instance.connect();
            this.addMigrator('redis', migrate_1.default, instance, this);
            this.redis = instance;
            this.emit('plugin:connect:redisSentinel', instance);
            return instance;
        },
        /**
         * @returns Returns current status of redis sentinel.
         */
        status: utils_1.hasConnection.bind(this, isRedisStarted),
        /**
         * @returns Closes redis connection.
         */
        async close() {
            assert(isRedisStarted(), constants_1.ERROR_NOT_STARTED);
            await this.redis
                .quit()
                .catchReturn({ message: 'Connection is closed.' }, null);
            this.redis = null;
            this.emit('plugin:close:redisSentinel');
        },
    };
}
exports.attach = attach;
//# sourceMappingURL=redisSentinel.js.map