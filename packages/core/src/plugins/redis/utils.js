"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("util");
const assert_1 = require("assert");
const common_errors_1 = require("common-errors");
const _debug = require("debug");
const fs = require("fs");
const _glob = require("glob");
const path = require("path");
const constants_1 = require("./constants");
const debug = _debug('mservice:lua');
const glob = util_1.promisify(_glob);
const readFile = util_1.promisify(fs.readFile);
/**
 * Loads LUA script and defines it on the redis instance.
 * @param dir - Directory to scan for LUA scripts to load.
 * @param redis - Redis connector instance.
 */
async function loadLuaScripts(ctx, dir, redis) {
    // NOTE: this is a concious decision to use await serially
    // so that it's easier to debug
    // Operations that happen here are a one-off during script startup
    // process and gains from reading files in parallel IMO aren't
    // worth extra complexity
    const locations = Array.isArray(dir) ? dir : [dir];
    for (const location of locations) {
        if (!path.isAbsolute(location)) {
            throw new common_errors_1.ArgumentError('config.scripts must be an absolute path');
        }
        debug('loading from %s', location);
        const scripts = await glob('*.lua', { cwd: location });
        for (const scriptName of scripts) {
            const lua = await readFile(`${location}/${scriptName}`, 'utf8');
            const name = path.basename(scriptName, '.lua');
            debug('attaching %s', name);
            if (typeof redis[name] === 'undefined') {
                // NOTICE: make sure that you pass number of keys as first arg when supplying function
                redis.defineCommand(name, { lua });
            }
            else {
                ctx.log.warn('script %s already defined', name);
            }
        }
    }
}
exports.loadLuaScripts = loadLuaScripts;
function isStarted(service, RedisType) {
    return () => (service.redis && (service.redis instanceof RedisType));
}
exports.isStarted = isStarted;
async function hasConnection(hasRedis) {
    assert_1.strict(hasRedis(), constants_1.ERROR_NOT_STARTED);
    const ping = await this.redis.ping();
    assert_1.strict(ping, constants_1.ERROR_NOT_HEALTHY);
    return true;
}
exports.hasConnection = hasConnection;
//# sourceMappingURL=utils.js.map