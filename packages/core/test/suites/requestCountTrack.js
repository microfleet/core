
const Promise = require('bluebird');
const path = require('path');
const assert = require('assert');
const sinon = require('sinon');
const SocketIOClient = require('socket.io-client');

const RequestCountTracker = require("../../src/plugins/router/requestTracker");

describe('UnitTest router #requestCountTracker', () => {
  const { Microfleet: Mservice, ActionTransport } = require('../../src');

  describe('router enabled', () => {
    let rt;
    let clock;
    let service;

    before('start service', async () => {
      service = new Mservice({
        name: 'tester',
        plugins: ['router', 'http', 'logger', 'validator'],
        router: {
          routes: {
            directory: path.resolve(__dirname, '../router/helpers/actions'),
            setTransportsAsDefault: true,
            transports: [
              ActionTransport.http,
            ],
          },
        },
        validator: { schemas: ['../router/helpers/schemas'] },
      });

      await service.connect();

      rt = service.router.requestCountTracker;
    });

    after('stop service', async () => {
      await service.close();
    });

    describe('instance methods', () => {
      before('fake timers', () => {
        clock = sinon.useFakeTimers(Date.now());
      });

      after('restore time', () => {
        clock.restore();
      });

      it('increase connection count', () => {
        rt.increase('mytransport');
        const count = rt.get('mytransport');
        assert(count === 1, 'should increase counter')
      });

      it('decrease connection count', () => {
        rt.decrease('mytransport');
        const count = rt.get('mytransport');
        assert( count === 0, 'should increase counter');

        let error;
        try {
          rt.decrease('mytransport');
        } catch(e) {
          error = e;
        }

        assert.ok(error, 'should be an error');
        assert(error instanceof RangeError);
      });

      it('waits for request count drop and emits event', async () => {
        const stub = sinon.stub();

        rt.increase('transport');
        service.stopping = true;

        service.on('plugin:drain:transport', stub);

        const decreaseRequestCount = async () => {
          clock.tick(500);
          rt.decrease('transport');
        };

        const waitClose = async () => {
          await rt.waitForRequests('transport');
        };

        await Promise.all([waitClose(), decreaseRequestCount()]);

        assert(stub.called === true, 'should fire event');

      });
    });

    describe('helper methods', () => {
      it('returns request count', () => {
        rt.increase('fooTransport');
        const count = RequestCountTracker.getRequestCount(service, 'fooTransport');
        assert(count === 1, 'should return request count');
      });

      it('calls instance waitForEventMethod', async () => {
        const rt = service.router.requestCountTracker;
        const stubed = sinon.stub(rt, 'waitForRequests');

        await RequestCountTracker.waitForRequestsToFinish(service, 'barTransport');
        assert(stubed.callCount === 1, 'should call instance method using helper');
      });
    });
  });

  describe('no router plugin', () => {
    let service;

    before('start service', async () => {
      service = new Mservice({ name: 'tester', plugins: ['logger', 'validator'] });
      await service.connect();
    });

    after('stop service', async () => {
      await service.close();
    });

    describe('helper methods', () => {
      it('returns request count as 0', () => {
        const count = RequestCountTracker.getRequestCount(service, 'fooTransport');
        assert(count === 0);
      });
    });
  })
});

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
        assert(result.data.status ==='ok');
        assert(result.data.failed.length === 0);
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
