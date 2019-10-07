const { Writable } = require('stream');
const { expect } = require('chai');
const path = require('path');
const assert = require('assert');
const sinon = require('sinon');
const SocketIOClient = require('socket.io-client');

describe('RequestCountTracking suite', async function testSuite() {
  require('../config');
  const { Microfleet: Mservice, routerExtension, ActionTransport } = require('../../src');
  const auditLog = routerExtension('audit/log');
  const getAMQPRequest = require('../router/helpers/requests/amqp');
  const getHTTPRequest = require('../router/helpers/requests/http');
  const getSocketIORequest = require('../router/helpers/requests/socketIO');
  const verify = require('../router/helpers/verifyCase');

  const schemaLessAction = routerExtension('validate/schemaLessAction');

  /**
   * Changing service port to 3001 to AVOID same port usage when tests run parallel
   */

  it('counts requests on unknown routes', async function test() {
    const service = new Mservice({
      name: 'tester',
      http: { server: { handler: 'hapi', attachSocketIO: true, port: 3001 }, router: { enabled: true } },
      logger: {
        defaultLogger: true,
      },
      plugins: ['validator', 'logger', 'router', 'http', 'socketIO'],
      router: {
        routes: {
          directory: path.resolve(__dirname, '../router/helpers/actions'),
          setTransportsAsDefault: true,
          transports: [
            ActionTransport.http,
            ActionTransport.socketIO,
          ],
        },
        extensions: { enabled: ['preRequest', 'preResponse'], register: [ auditLog() ] }
      },
      socketIO: {
        router: {
          enabled: true,
        },
      },
      validator: { schemas: ['../router/helpers/schemas'] },
    });

    await service.connect();

    const { requestCountTracker } = service.router;
    const preRequestSpy = sinon.spy(requestCountTracker, 'increase');
    const postResponseSpy = sinon.spy(requestCountTracker, 'decrease');

    const HTTPRequest = getHTTPRequest({ method: 'get', url: 'http://0.0.0.0:3001' });
    const socketIOClient = SocketIOClient('http://0.0.0.0:3001');
    const socketIORequest = getSocketIORequest(socketIOClient);

    await HTTPRequest('/404').reflect();
    await socketIORequest('404', {}).reflect();

    assert(preRequestSpy.callCount === 2);
    assert(postResponseSpy.callCount === 2);

    await service.close();
    await socketIOClient.close();

  });

  it('count requests on existing routes', async function testSuite() {
    const service = new Mservice({
      name: 'tester',
      amqp: {
        transport: {
          connection: {
            host: 'rabbitmq',
          },
        },
        router: {
          enabled: true,
          prefix: 'amqp',
        },
      },
      http: {
        server: {
          attachSocketIO: true,
          handler: 'hapi',
          port: 3001,
        },
        router: {
          enabled: true,
        },
      },
      logger: {
        defaultLogger: true,
      },
      plugins: ['validator', 'logger', 'router', 'amqp', 'http', 'socketIO'],
      router: {
        routes: {
          directory: path.resolve(__dirname, '../router/helpers/actions'),
          prefix: 'action',
          setTransportsAsDefault: true,
          transports: [
            ActionTransport.amqp,
            ActionTransport.http,
            ActionTransport.socketIO,
            ActionTransport.internal,
          ],
          enabledGenericActions: ['health'],
        },
        extensions: {
          enabled: ['preRequest', 'postRequest', 'preResponse', 'postResponse'],
          register: [
            schemaLessAction,
            auditLog(),
          ],
        },
      },
      socketIO: {
        router: {
          enabled: true,
        },
      },
      validator: { schemas: ['../router/helpers/schemas'] },
    });

    await service.connect();
    const { requestCountTracker } = service.router;
    const preRequestSpy = sinon.spy(requestCountTracker, 'increase');
    const postResponseSpy = sinon.spy(requestCountTracker, 'decrease');


    const AMQPRequest = getAMQPRequest(service.amqp);
    const HTTPRequest = getHTTPRequest({ method: 'get', url: 'http://0.0.0.0:3001' });
    const socketIOClient = SocketIOClient('http://0.0.0.0:3001');
    const socketIORequest = getSocketIORequest(socketIOClient);

    const returnsResult = {
      expect: 'success',
      verify: (result) => {
        expect(result.data.status).to.be.equals('ok');
        expect(result.data.failed).to.have.lengthOf(0);
      },
    };

    await AMQPRequest('amqp.action.generic.health', {}).reflect().then(verify(returnsResult));
    await HTTPRequest('/action/generic/health').reflect().then(verify(returnsResult));
    await socketIORequest('action.generic.health', {}).reflect().then(verify(returnsResult));

    console.log( preRequestSpy.callCount, preRequestSpy.callCount);
    assert(preRequestSpy.callCount === 3);
    assert(postResponseSpy.callCount === 3);

    await service.close();
    await socketIOClient.close();
  });
});
