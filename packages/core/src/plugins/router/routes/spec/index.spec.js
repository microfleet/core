"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const path = require("path");
const __1 = require("..");
const __2 = require("../../../..");
describe('router: get routes', () => {
    const microfleet = { log: console };
    it('should be able to get only enabled routes', () => {
        const config = {
            directory: path.resolve(__dirname, 'examples/actions/simple'),
            enabled: {
                bar: 'foo',
                baz: 'baz',
            },
            enabledGenericActions: [
                'health',
            ],
            prefix: 'action',
            transports: [
                __2.ActionTransport.http,
                __2.ActionTransport.amqp,
                __2.ActionTransport.socketIO,
                __2.ActionTransport.internal,
            ],
        };
        const routes = __1.getRoutes.call(microfleet, config);
        chai_1.expect(routes).to.be.an('object');
        chai_1.expect(Object.keys(routes)).to.have.lengthOf(5);
        // all routes
        chai_1.expect(routes).to.have.property('_all');
        chai_1.expect(routes._all).to.have.property('action.foo');
        chai_1.expect(routes._all['action.foo']).to.be.a('function');
        chai_1.expect(routes._all).to.have.property('action.baz');
        chai_1.expect(routes._all['action.baz']).to.be.a('function');
        chai_1.expect(routes._all).to.have.property('action.generic.health');
        chai_1.expect(routes._all['action.generic.health']).to.be.a('function');
        chai_1.expect(Object.keys(routes._all)).to.have.lengthOf(3);
        // http routes
        chai_1.expect(routes).to.have.property('http');
        chai_1.expect(routes.http).to.have.property('action.foo');
        chai_1.expect(routes.http['action.foo']).to.be.a('function');
        chai_1.expect(routes.http).to.have.property('action.generic.health');
        chai_1.expect(routes.http['action.generic.health']).to.be.a('function');
        chai_1.expect(Object.keys(routes.http)).to.have.lengthOf(2);
        // socketIO routes
        chai_1.expect(routes).to.have.property('socketIO');
        chai_1.expect(routes.socketIO).to.have.property('action.baz');
        chai_1.expect(routes.socketIO['action.baz']).to.be.a('function');
        chai_1.expect(routes.socketIO).to.have.property('action.generic.health');
        chai_1.expect(routes.socketIO['action.generic.health']).to.be.a('function');
        chai_1.expect(Object.keys(routes.socketIO)).to.have.lengthOf(2);
        // amqp routes
        chai_1.expect(routes).to.have.property('amqp');
        chai_1.expect(routes.amqp).to.have.property('action.generic.health');
        chai_1.expect(routes.amqp['action.generic.health']).to.be.a('function');
        chai_1.expect(Object.keys(routes.amqp)).to.have.lengthOf(1);
        // internal routes
        chai_1.expect(routes).to.have.property('internal');
        chai_1.expect(routes.internal).to.have.property('action.generic.health');
        chai_1.expect(routes.internal['action.generic.health']).to.be.a('function');
        chai_1.expect(Object.keys(routes.internal)).to.have.lengthOf(1);
    });
    it('should be able to get routes from directory', () => {
        const config = {
            directory: path.resolve(__dirname, 'examples/actions/simple'),
            enabled: {},
            enabledGenericActions: [],
            prefix: 'action',
            transports: [__2.ActionTransport.socketIO],
        };
        const routes = __1.getRoutes.call(microfleet, config);
        chai_1.expect(routes).to.be.an('object');
        chai_1.expect(Object.keys(routes)).to.have.lengthOf(2);
        // all routes
        chai_1.expect(routes).to.have.property('_all');
        chai_1.expect(routes._all).to.have.property('action.foo');
        chai_1.expect(routes._all['action.foo']).to.be.a('function');
        chai_1.expect(routes._all).to.have.property('action.bar');
        chai_1.expect(routes._all['action.bar']).to.be.a('function');
        chai_1.expect(routes._all).to.have.property('action.baz');
        chai_1.expect(routes._all['action.baz']).to.be.a('function');
        chai_1.expect(Object.keys(routes._all)).to.have.lengthOf(3);
        // socketIO routes
        chai_1.expect(routes).to.have.property('socketIO');
        chai_1.expect(routes.socketIO).to.have.property('action.foo');
        chai_1.expect(routes.socketIO['action.foo']).to.be.a('function');
        chai_1.expect(routes.socketIO).to.have.property('action.baz');
        chai_1.expect(routes.socketIO['action.baz']).to.be.a('function');
        chai_1.expect(Object.keys(routes.socketIO)).to.have.lengthOf(2);
    });
    it('should be able to set default transports', () => {
        const config = {
            directory: path.resolve(__dirname, 'examples/actions/withoutTransport'),
            enabled: {},
            enabledGenericActions: [],
            prefix: 'action',
            setTransportsAsDefault: true,
            transports: [__2.ActionTransport.socketIO],
        };
        const routes = __1.getRoutes.call(microfleet, config);
        // socketIO routes
        chai_1.expect(routes).to.have.property('socketIO');
        chai_1.expect(routes.socketIO).to.have.property('action.bar');
        chai_1.expect(routes.socketIO['action.bar']).to.be.a('function');
        chai_1.expect(routes.socketIO['action.bar'].actionName).to.be.equals('bar');
        chai_1.expect(Object.keys(routes.socketIO)).to.have.lengthOf(1);
    });
});
//# sourceMappingURL=index.spec.js.map