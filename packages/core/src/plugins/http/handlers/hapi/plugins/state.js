"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.name = 'mservice-state';
exports.version = '1.0.0';
exports.once = true;
function register(server) {
    server._core.root.decorate('request', 'setState', function setState(cookieName, value, stateOptions) {
        return this._setState(cookieName, value, stateOptions);
    });
}
exports.register = register;
//# sourceMappingURL=state.js.map