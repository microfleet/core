"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lifecycle_1 = require("./lifecycle");
function handler(request) {
    const { extensions } = this.router;
    return lifecycle_1.default('handler', request.action, extensions, [request], this);
}
exports.default = handler;
//# sourceMappingURL=handler.js.map