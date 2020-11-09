import { expect } from 'chai'
import path = require('path')
import { getRoutes } from '..'
import { ActionTransport } from '@microfleet/utils'

describe('router: get routes', () => {
  const microfleet = { log: console } as any

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
        ActionTransport.http,
        ActionTransport.amqp,
        ActionTransport.socketIO,
        ActionTransport.internal,
      ],
    }

    const routes = getRoutes.call(microfleet, config)

    expect(routes).to.be.an('object')
    expect(Object.keys(routes)).to.have.lengthOf(5)

    // all routes
    expect(routes).to.have.property('_all')
    expect(routes._all).to.have.property('action.foo')
    expect(routes._all['action.foo']).to.be.a('function')
    expect(routes._all).to.have.property('action.baz')
    expect(routes._all['action.baz']).to.be.a('function')
    expect(routes._all).to.have.property('action.generic.health')
    expect(routes._all['action.generic.health']).to.be.a('function')
    expect(Object.keys(routes._all)).to.have.lengthOf(3)

    // http routes
    expect(routes).to.have.property('http')
    expect(routes.http).to.have.property('action.foo')
    expect(routes.http['action.foo']).to.be.a('function')
    expect(routes.http).to.have.property('action.generic.health')
    expect(routes.http['action.generic.health']).to.be.a('function')
    expect(Object.keys(routes.http)).to.have.lengthOf(2)

    // socketIO routes
    expect(routes).to.have.property('socketIO')
    expect(routes.socketIO).to.have.property('action.baz')
    expect(routes.socketIO['action.baz']).to.be.a('function')
    expect(routes.socketIO).to.have.property('action.generic.health')
    expect(routes.socketIO['action.generic.health']).to.be.a('function')
    expect(Object.keys(routes.socketIO)).to.have.lengthOf(2)

    // amqp routes
    expect(routes).to.have.property('amqp')
    expect(routes.amqp).to.have.property('action.generic.health')
    expect(routes.amqp['action.generic.health']).to.be.a('function')
    expect(Object.keys(routes.amqp)).to.have.lengthOf(1)

    // internal routes
    expect(routes).to.have.property('internal')
    expect(routes.internal).to.have.property('action.generic.health')
    expect(routes.internal['action.generic.health']).to.be.a('function')
    expect(Object.keys(routes.internal)).to.have.lengthOf(1)
  })

  it('should be able to get routes from directory', () => {
    const config = {
      directory: path.resolve(__dirname, 'examples/actions/simple'),
      enabled: {},
      enabledGenericActions: [],
      prefix: 'action',
      transports: [ActionTransport.socketIO],
    }

    const routes = getRoutes.call(microfleet, config)

    expect(routes).to.be.an('object')
    expect(Object.keys(routes)).to.have.lengthOf(2)

    // all routes
    expect(routes).to.have.property('_all')
    expect(routes._all).to.have.property('action.foo')
    expect(routes._all['action.foo']).to.be.a('function')
    expect(routes._all).to.have.property('action.bar')
    expect(routes._all['action.bar']).to.be.a('function')
    expect(routes._all).to.have.property('action.baz')
    expect(routes._all['action.baz']).to.be.a('function')
    expect(Object.keys(routes._all)).to.have.lengthOf(3)

    // socketIO routes
    expect(routes).to.have.property('socketIO')
    expect(routes.socketIO).to.have.property('action.foo')
    expect(routes.socketIO['action.foo']).to.be.a('function')
    expect(routes.socketIO).to.have.property('action.baz')
    expect(routes.socketIO['action.baz']).to.be.a('function')
    expect(Object.keys(routes.socketIO)).to.have.lengthOf(2)
  })

  it('should be able to set default transports', () => {
    const config = {
      directory: path.resolve(__dirname, 'examples/actions/withoutTransport'),
      enabled: {},
      enabledGenericActions: [],
      prefix: 'action',
      setTransportsAsDefault: true,
      transports: [ActionTransport.socketIO],
    }

    const routes = getRoutes.call(microfleet, config)

    // socketIO routes
    expect(routes).to.have.property('socketIO')
    expect(routes.socketIO).to.have.property('action.bar')
    expect(routes.socketIO['action.bar']).to.be.a('function')
    expect(routes.socketIO['action.bar'].actionName).to.be.equals('bar')
    expect(Object.keys(routes.socketIO)).to.have.lengthOf(1)
  })
})
