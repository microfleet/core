"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Bluebird = require("bluebird");
const pino_1 = require("pino");
const assert_1 = require("assert");
const core_1 = require("@microfleet/core");
describe('Logger suite', () => {
    it('when service does not include `logger` plugin, it emits an error or throws', () => {
        const plugins = [];
        const service = new core_1.Microfleet({
            plugins,
            name: 'tester',
        });
        assert_1.strict(!service.log);
    });
    it('logger inits with output to stdout', () => {
        const service = new core_1.Microfleet({
            name: 'tester',
            plugins: ['validator', 'logger'],
            logger: {
                defaultLogger: true,
            },
        });
        assert_1.strict.ok(service.log);
        assert_1.strict.ok(typeof service.log.info === 'function');
    });
    it('logger inits with output to stdout: debug', () => {
        const service = new core_1.Microfleet({
            name: 'tester',
            plugins: ['validator', 'logger'],
            logger: {
                defaultLogger: true,
                debug: true,
            },
        });
        assert_1.strict.ok(service.log);
        assert_1.strict.ok(typeof service.log.info === 'function');
    });
    it('should be able to init custom logger', () => {
        const logger = pino_1.default({ name: 'test' });
        const service = new core_1.Microfleet({
            name: 'tester',
            plugins: ['validator', 'logger'],
            logger: {
                defaultLogger: logger,
            },
        });
        assert_1.strict.deepEqual(service.log, logger);
    });
    it('should be able to init sentry stream', async () => {
        const service = new core_1.Microfleet({
            name: 'tester',
            plugins: ['validator', 'logger'],
            logger: {
                streams: {
                    sentry: {
                        dsn: 'https://api@sentry.io/1822',
                    },
                },
            },
        });
        service.log.info({ sample: 'message', latency: 200 }, 'test');
        service.log.debug({ sample: 'message', latency: 200 }, 'test');
        service.log.debug({ sample: 'message', latency: 200 }, 'test');
        service.log.error(new Error('crap'), 'test');
        service.log.error('failed to produce message', [], new Error('oops'));
        service.log.error({ err: new Error('somewhere') }, 'empty object?');
        service.log.error({ err: new Error('fatal') }, 'unexpected error');
        await Bluebird.delay(1000);
        assert_1.strict.ok(service.log);
        assert_1.strict.ok(typeof service.log.info === 'function');
    });
});
//# sourceMappingURL=logger.spec.js.map