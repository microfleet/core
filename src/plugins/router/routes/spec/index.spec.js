const { ActionTransport } = require('../../../..');
const { expect } = require('chai');
const getRoutes = require('..');
const path = require('path');

describe('router: get routes', function suite() {
  it('should be able to get only enabled routes', (done) => {
    const config = {
      directory: path.resolve(__dirname, 'examples/actions/simple'),
      enabled: {
        baz: 'baz',
        bar: 'foo',
      },
      prefix: 'action',
      transports: [ActionTransport.http, ActionTransport.socketIO],
    };

    const routes = getRoutes(config);

    expect(routes).to.be.an('object');
    expect(Object.keys(routes)).to.have.lengthOf(3);

    // all routes
    expect(routes).to.have.property('_all');
    expect(routes._all).to.have.property('action.foo');
    expect(routes._all['action.foo']).to.be.a('function');
    expect(routes._all).to.have.property('action.baz');
    expect(routes._all['action.baz']).to.be.a('function');
    expect(Object.keys(routes._all)).to.have.lengthOf(2);

    // http routes
    expect(routes).to.have.property('http');
    expect(routes.http).to.have.property('action.foo');
    expect(routes.http['action.foo']).to.be.a('function');
    expect(Object.keys(routes.http)).to.have.lengthOf(1);

    // socketIO routes
    expect(routes).to.have.property('socketIO');
    expect(routes.socketIO).to.have.property('action.baz');
    expect(routes.socketIO['action.baz']).to.be.a('function');
    expect(Object.keys(routes.socketIO)).to.have.lengthOf(1);

    done();
  });

  it('should be able to get routes from directory', (done) => {
    const config = {
      directory: path.resolve(__dirname, 'examples/actions/simple'),
      enabled: {},
      prefix: 'action',
      transports: [ActionTransport.socketIO],
    };

    const routes = getRoutes(config);

    expect(routes).to.be.an('object');
    expect(Object.keys(routes)).to.have.lengthOf(2);

    // all routes
    expect(routes).to.have.property('_all');
    expect(routes._all).to.have.property('action.foo');
    expect(routes._all['action.foo']).to.be.a('function');
    expect(routes._all).to.have.property('action.bar');
    expect(routes._all['action.bar']).to.be.a('function');
    expect(routes._all).to.have.property('action.baz');
    expect(routes._all['action.baz']).to.be.a('function');
    expect(Object.keys(routes._all)).to.have.lengthOf(3);

    // socketIO routes
    expect(routes).to.have.property('socketIO');
    expect(routes.socketIO).to.have.property('action.foo');
    expect(routes.socketIO['action.foo']).to.be.a('function');
    expect(routes.socketIO).to.have.property('action.baz');
    expect(routes.socketIO['action.baz']).to.be.a('function');
    expect(Object.keys(routes.socketIO)).to.have.lengthOf(2);

    done();
  });

  it('should be able to set default transports', (done) => {
    const config = {
      directory: path.resolve(__dirname, 'examples/actions/withoutTransport'),
      enabled: {},
      prefix: 'action',
      setTransportsAsDefault: true,
      transports: [ActionTransport.socketIO],
    };

    const routes = getRoutes(config);

    // socketIO routes
    expect(routes).to.have.property('socketIO');
    expect(routes.socketIO).to.have.property('action.bar');
    expect(routes.socketIO['action.bar']).to.be.a('function');
    expect(routes.socketIO['action.bar'].actionName).to.be.equals('bar');
    expect(Object.keys(routes.socketIO)).to.have.lengthOf(1);

    done();
  });
});
