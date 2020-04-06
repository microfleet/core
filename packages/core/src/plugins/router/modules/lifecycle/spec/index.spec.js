"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Bluebird = require("bluebird");
const chai_1 = require("chai");
const __1 = require("..");
const extensions_1 = require("./../../../extensions");
describe('router: module lifecycle', () => {
    it('should return error from "pre-handler"', async () => {
        const extensions = new extensions_1.default({
            enabled: [extensions_1.LifecyclePoints.preAuth],
            register: [
                [
                    { point: extensions_1.LifecyclePoints.preAuth, handler: (foo, bar) => Bluebird.resolve([foo, bar]) },
                    { point: extensions_1.LifecyclePoints.preAuth, handler: (_, bar) => Bluebird.reject(new Error(`error: ${bar}`)) },
                ],
            ],
        });
        const handler = (_, bar) => Bluebird.resolve(`result: ${bar}`);
        const inspection = await __1.default('auth', handler, extensions, ['foo', 'bar'])
            .reflect();
        const error = inspection.reason();
        chai_1.expect(error.message).to.be.equals('error: bar');
    });
    it('should return result from handler with "pre-handler"', () => {
        const extensions = new extensions_1.default({
            enabled: [extensions_1.LifecyclePoints.preAuth],
            register: [
                [
                    { point: extensions_1.LifecyclePoints.preAuth, handler: (_, bar) => Bluebird.resolve([bar, 'baz']) },
                ],
            ],
        });
        const handler = (_, baz) => Bluebird.resolve(`result: ${baz}`);
        return __1.default('auth', handler, extensions, ['bar', 'foo'])
            .reflect()
            .then((inspection) => {
            chai_1.expect(inspection.value()).to.be.equals('result: baz');
        });
    });
    it('should return result from handler with "pre-handler" that takes one argument', () => {
        const extensions = new extensions_1.default({
            enabled: [extensions_1.LifecyclePoints.preAuth],
            register: [
                [
                    { point: extensions_1.LifecyclePoints.preAuth, handler: (request) => Bluebird.resolve(`${request} bar`) },
                    { point: extensions_1.LifecyclePoints.preAuth, handler: (request) => Bluebird.resolve(`${request} baz`) },
                ],
            ],
        });
        const handler = (request) => Bluebird.resolve(`result: ${request}`);
        return __1.default('auth', handler, extensions, ['foo'])
            .reflect()
            .then((inspection) => {
            chai_1.expect(inspection.value()).to.be.equals('result: foo bar baz');
        });
    });
    it('should return result from handler', () => {
        const extensions = new extensions_1.default();
        const handler = (_, bar) => Bluebird.resolve(`result: ${bar}`);
        return __1.default('auth', handler, extensions, ['foo', 'bar'])
            .reflect()
            .then((inspection) => {
            chai_1.expect(inspection.value()).to.be.equals('result: bar');
        });
    });
    it('should return error from handler', () => {
        const extensions = new extensions_1.default();
        const handler = (_, bar) => Bluebird.reject(new Error(`result error: ${bar}`));
        return __1.default('auth', handler, extensions, ['foo', 'bar'])
            .reflect()
            .then((inspection) => {
            chai_1.expect(inspection.reason().message).to.be.equals('result error: bar');
        });
    });
    it('should return error from post-handler', () => {
        const extensions = new extensions_1.default({
            enabled: [extensions_1.LifecyclePoints.postAuth],
            register: [
                [{
                        point: extensions_1.LifecyclePoints.postAuth,
                        handler: (error, result) => Bluebird.resolve([error, result]),
                    }, {
                        point: extensions_1.LifecyclePoints.postAuth,
                        handler: (_, result) => Bluebird.reject(new Error(`error: ${result}`)),
                    }],
            ],
        });
        const handler = (foo, bar) => Bluebird.resolve(`${foo}.${bar}`);
        return __1.default('auth', handler, extensions, ['foo', 'bar'])
            .reflect()
            .then((inspection) => {
            chai_1.expect(inspection.reason().message).to.be.equals('error: foo.bar');
        });
    });
    it('should be able to modify result if no error returned from handler', () => {
        const extensions = new extensions_1.default({
            enabled: [extensions_1.LifecyclePoints.postAuth],
            register: [
                [
                    {
                        handler: (error) => Bluebird.resolve([error, 'baz']),
                        point: extensions_1.LifecyclePoints.postAuth,
                    },
                ],
            ],
        });
        const handler = (foo, bar) => Bluebird.resolve(`${foo}.${bar}`);
        return __1.default('auth', handler, extensions, ['foo', 'bar'])
            .reflect()
            .then((inspection) => {
            chai_1.expect(inspection.value()).to.be.equals('baz');
        });
    });
    it('should be able to modify error returned from handler', () => {
        const extensions = new extensions_1.default({
            enabled: [extensions_1.LifecyclePoints.postAuth],
            register: [
                [{
                        point: extensions_1.LifecyclePoints.postAuth,
                        handler: (_, result) => Bluebird.resolve([new Error('baz'), result]),
                    }],
            ],
        });
        const handler = (foo, bar) => Bluebird.reject(new Error(`${foo}.${bar}`));
        return __1.default('auth', handler, extensions, ['foo', 'bar'])
            .reflect()
            .then((inspection) => {
            chai_1.expect(inspection.reason().message).to.be.equals('baz');
        });
    });
    it('should be able to pass arguments to post-handler', () => {
        const extensions = new extensions_1.default({
            enabled: [extensions_1.LifecyclePoints.postAuth],
            register: [
                [{
                        point: extensions_1.LifecyclePoints.postAuth,
                        handler: (_, __, foo, bar) => Bluebird.resolve([new Error(foo + bar)]),
                    }],
            ],
        });
        const handler = (foo, bar) => Bluebird.resolve(`${foo}.${bar}`);
        return __1.default('auth', handler, extensions, ['foo', 'bar'])
            .reflect()
            .then((inspection) => {
            chai_1.expect(inspection.reason().message).to.be.equals('foobar');
        });
    });
});
//# sourceMappingURL=index.spec.js.map