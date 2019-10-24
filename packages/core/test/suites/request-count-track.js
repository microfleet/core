const path = require('path');
const assert = require('assert');
const sinon = require('sinon');
const SocketIOClient = require('socket.io-client');

describe('service request count', () => {
  const { Microfleet, routerExtension, ActionTransport } = require('../..');
  const auditLog = routerExtension('audit/log');
  const getAMQPRequest = require('../router/helpers/requests/amqp');
  const getHTTPRequest = require('../router/helpers/requests/http');
  const getSocketIORequest = require('../router/helpers/requests/socketIO');
  const verify = require('../router/helpers/verifyCase');

  const schemaLessAction = routerExtension('validate/schemaLessAction');

  it('counts requests on unknown routes', async () => {
    const service = new Microfleet({
      name: 'tester',
      http: { server: { handler: 'hapi', attachSocketIO: true, port: 0 }, router: { enabled: true } },
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
        extensions: { enabled: ['preRequest', 'preResponse'], register: [auditLog()] },
      },
      socketIO: {
        router: {
          enabled: true,
        },
      },
      validator: { schemas: ['../router/helpers/schemas'] },
    });

    await service.connect();
    const servicePort = service.http.info.port;
    const serviceUrl = `http://0.0.0.0:${servicePort}`;
    const { requestCountTracker } = service.router;
    const preRequestSpy = sinon.spy(requestCountTracker, 'increase');
    const postResponseSpy = sinon.spy(requestCountTracker, 'decrease');

    const HTTPRequest = getHTTPRequest({ method: 'get', url: serviceUrl });
    const socketIOClient = SocketIOClient(serviceUrl);
    const socketIORequest = getSocketIORequest(socketIOClient);

    await HTTPRequest('/404').reflect();
    await socketIORequest('404', {}).reflect();

    assert(preRequestSpy.callCount === 2);
    assert(postResponseSpy.callCount === 2);

    await socketIOClient.close();
    await service.close();
  });

  it('counts requests on existing routes', async () => {
    const service = new Microfleet({
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
          port: 0,
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

    const servicePort = service.http.info.port;
    const serviceUrl = `http://0.0.0.0:${servicePort}`;

    const { requestCountTracker } = service.router;
    const preRequestSpy = sinon.spy(requestCountTracker, 'increase');
    const postResponseSpy = sinon.spy(requestCountTracker, 'decrease');

    const AMQPRequest = getAMQPRequest(service.amqp);
    const HTTPRequest = getHTTPRequest({ method: 'get', url: serviceUrl });
    const socketIOClient = SocketIOClient(serviceUrl);
    const socketIORequest = getSocketIORequest(socketIOClient);

    const returnsResult = {
      expect: 'success',
      verify: (result) => {
        assert(result.data.status === 'ok');
        assert(result.data.failed.length === 0);
      },
    };

    await AMQPRequest('amqp.action.generic.health', {}).reflect().then(verify(returnsResult));
    await HTTPRequest('/action/generic/health').reflect().then(verify(returnsResult));
    await socketIORequest('action.generic.health', {}).reflect().then(verify(returnsResult));

    assert(preRequestSpy.callCount === 3);
    assert(postResponseSpy.callCount === 3);

    await service.close();
    await socketIOClient.close();
  });
});
