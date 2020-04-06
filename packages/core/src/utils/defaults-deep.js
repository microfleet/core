"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
function customizer(_objectValue, sourceValue) {
    return Array.isArray(sourceValue) ? sourceValue : undefined;
}
function defaultsDeep(...sources) {
    const output = Object.create(null);
    for (const source of sources.reverse()) {
        lodash_1.mergeWith(output, source, customizer);
    }
    return output;
}
exports.default = defaultsDeep;
//# sourceMappingURL=defaults-deep.js.map