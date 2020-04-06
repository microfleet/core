"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const common_errors_1 = require("common-errors");
const hapi_1 = require("@hapi/hapi");
const Joi = require("@hapi/joi");
const __1 = require("../../../..");
const attach_1 = require("./router/attach");
const RequestTracker = require("../../../router/request-tracker");
const defaultPlugins = [{
        options: {},
        plugin: './plugins/redirect',
    }, {
        options: {},
        plugin: './plugins/state',
    }];
function createHapiServer(config, service) {
    const { handlerConfig } = config.server;
    handlerConfig.server.address = config.server.host || '0.0.0.0';
    handlerConfig.server.port = config.server.port ? config.server.port : 0;
    assert(service.hasPlugin('logger'), 'must include logger plugin');
    const server = service.http = new hapi_1.Server(handlerConfig.server);
    server.validator(Joi);
    let routerPlugin;
    if (config.router.enabled) {
        routerPlugin = attach_1.default(service, config.router);
    }
    // exposes microfleet inside the server for tighter integrations
    server.decorate('server', 'microfleet', service);
    async function initPlugins() {
        const { list, options } = handlerConfig.plugins;
        const plugins = defaultPlugins.concat(list);
        if (handlerConfig.views) {
            plugins.push({
                options: {},
                plugin: '@hapi/vision',
            });
            plugins.push({
                options: handlerConfig.views,
                plugin: './plugins/views',
            });
        }
        if (routerPlugin !== undefined) {
            plugins.push(routerPlugin);
        }
        const registrations = [];
        for (const pluguinConfiguration of plugins) {
            registrations.push({
                options: pluguinConfiguration.options,
                plugin: typeof pluguinConfiguration.plugin === 'string'
                    ? require(pluguinConfiguration.plugin)
                    : pluguinConfiguration.plugin,
            });
        }
        return server.register(registrations, options);
    }
    async function startServer() {
        var _a;
        if (config.server.attachSocketIO) {
            if (!service.socketIO) {
                throw new common_errors_1.NotPermittedError('SocketIO plugin not found');
            }
            service.socketIO.listen(server.listener, (_a = service.config.socketIO) === null || _a === void 0 ? void 0 : _a.options);
        }
        await initPlugins();
        await server.start();
        service.log.info({ transport: 'http', http: '@hapi/hapi' }, 'listening on http://%s:%s', handlerConfig.server.address, server.info.port);
        service.emit('plugin:start:http', server);
        return server;
    }
    function getRequestCount() {
        return RequestTracker.getRequestCount(service, __1.ActionTransport.http);
    }
    async function stopServer() {
        const { started } = server.info;
        if (started) {
            /* Socket depends on Http transport. Wait for its requests here */
            /* Call of socketIO.close() causes all active connections close */
            if (config.server.attachSocketIO) {
                await RequestTracker.waitForRequestsToFinish(service, __1.ActionTransport.socketIO);
            }
            /* Server waits for connection finish anyway */
            await server.stop();
        }
        service.emit('plugin:stop:http', server);
    }
    return {
        getRequestCount,
        close: stopServer,
        connect: startServer,
    };
}
exports.default = createHapiServer;
//# sourceMappingURL=index.js.map