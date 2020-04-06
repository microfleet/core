"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.name = 'view-wrapper';
exports.dependencies = '@hapi/vision';
exports.version = '1.0.0';
exports.once = true;
function register(server, options) {
    server._core.root.views(options);
    server._core.root.decorate('request', 'sendView', async function sendView(...args) {
        const page = await this.render(...args);
        return this.generateResponse(page);
    });
}
exports.register = register;
//# sourceMappingURL=views.js.map