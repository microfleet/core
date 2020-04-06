"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require("..");
exports.default = [{
        point: __1.LifecyclePoints.postRequest,
        async handler(error, request) {
            if (error) {
                throw error;
            }
            const { action } = request;
            if (action.schema === undefined) {
                action.schema = action.actionName;
            }
            return [error, request];
        },
    }];
//# sourceMappingURL=schemaLessAction.js.map