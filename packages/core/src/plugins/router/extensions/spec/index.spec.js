"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const Bluebird = require("bluebird");
const common_errors_1 = require("common-errors");
const __1 = require("..");
describe('router: extensions', () => {
    it('should be able to auto register extension', async () => {
        const config = {
            enabled: [
                __1.LifecyclePoints.preHandler,
                __1.LifecyclePoints.postHandler,
            ],
            register: [
                [
                    { point: __1.LifecyclePoints.postHandler, handler: Bluebird.resolve },
                ],
            ],
        };
        const extensions = new __1.default(config);
        assert.doesNotThrow(() => {
            extensions.register(__1.LifecyclePoints.preHandler, () => Bluebird.reject(new Error('q')));
        });
        await extensions.exec('postHandler', ['foo']);
    });
    it('should not be able to execute unknown extension', async () => {
        const extensions = new __1.default();
        const inspection = await extensions
            .exec('postPreHandler', ['foo'])
            .reflect();
        const error = inspection.reason();
        assert(error instanceof common_errors_1.NotSupportedError);
        assert.equal(error.message, 'Not Supported: postPreHandler');
    });
});
//# sourceMappingURL=index.spec.js.map