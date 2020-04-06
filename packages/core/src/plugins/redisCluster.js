"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const Bluebird = require("bluebird");
const _debug = require("debug");
const eventToPromise = require("event-to-promise");
const __1 = require("../");
const require_1 = require("../utils/require");
const migrate_1 = require("./redis/migrate");
const common_errors_1 = require("common-errors");
const utils_1 = require("./redis/utils");
const constants_1 = require("./redis/constants");
const debug = _debug('mservice:redisCluster');
/**
 * Plugin name
 */
exports.name = 'redis';
/**
 * Plugin type
 */
exports.type = __1.PluginTypes.database;
/**
 * Relative priority inside the same plugin group type
 */
exports.priority = 0;
/**
 * Attaches Redis Cluster plugin.
 * @param  [conf={}] - Configuration for Redis Cluster Connection.
 * @returns Connections and Destructors.
 */
function attach(opts = {}) {
    const Redis = require_1.default('ioredis');
    assert(this.hasPlugin('validator'), new common_errors_1.NotFoundError('validator module must be included'));
    // push out its own bluebird version and configure cancellation
    Redis.Promise = Bluebird.getNewLibraryCopy();
    Redis.Promise.config({
        cancellation: true,
    });
    const { Cluster } = Redis;
    const isClusterStarted = utils_1.isStarted(this, Cluster);
    const conf = this.validator.ifError('redisCluster', opts);
    return {
        /**
         * @returns Opens redis connection.
         */
        async connect() {
            assert(this.redis == null, constants_1.ERROR_ALREADY_STARTED);
            const instance = new Cluster(conf.hosts, {
                ...conf.options,
                lazyConnect: true,
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
            const $conn = instance.connect();
            const $ready = eventToPromise(instance, 'ready', { ignoreErrors: true });
            await Bluebird.race([$conn, $ready]);
            // cancel either promise
            if ($conn.isPending()) {
                $conn.cancel();
            }
            else {
                $ready.cancel();
            }
            this.addMigrator('redis', migrate_1.default, instance, this);
            this.redis = instance;
            this.emit('plugin:connect:redisCluster', instance);
            return instance;
        },
        /**
         * @returns Returns current status of redis cluster.
         */
        status: utils_1.hasConnection.bind(this, isClusterStarted),
        /**
         * @returns Closes redis connection.
         */
        async close() {
            assert(isClusterStarted(), constants_1.ERROR_NOT_STARTED);
            await this.redis
                .quit()
                .catchReturn({ message: 'Connection is closed.' }, null);
            this.redis = null;
            this.emit('plugin:close:redisCluster');
        },
    };
}
exports.attach = attach;
//# sourceMappingURL=redisCluster.js.map