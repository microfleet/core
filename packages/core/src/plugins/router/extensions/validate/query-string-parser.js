"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const identity = require("lodash/identity");
const qs_1 = require("qs");
const __1 = require("..");
function preValidate(request) {
    const { query } = request;
    // if present - remap, otherwise just noop
    if (query) {
        const { action } = request;
        const { transformQuery = identity, transformOpts } = action;
        // eslint-disable-next-line no-param-reassign
        request.query = transformQuery(qs_1.parse(query, {
            depth: 1,
            parameterLimit: 10,
            parseArrays: false,
            ...transformOpts,
        }));
    }
    return request;
}
exports.default = [{
        handler: preValidate,
        point: __1.LifecyclePoints.preValidate,
    }];
//# sourceMappingURL=query-string-parser.js.map