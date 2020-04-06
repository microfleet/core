"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.name = 'mservice-redirect';
exports.version = '1.0.0';
exports.once = true;
function register(server) {
    server._core.root.decorate('request', 'redirect', function redirectResponse(url) {
        return this.generateResponse(null).redirect(url);
    });
}
exports.register = register;
//# sourceMappingURL=redirect.js.map