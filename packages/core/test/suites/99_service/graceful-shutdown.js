
const Promise = require('bluebird');
const path = require('path');
const assert = require('assert');
const sinon = require('sinon');

const SocketIOClient = require('socket.io-client');
const { Microfleet: Mservice } = require('../../../src');

describe('service graceful shutdown', async function testSuite() {
  const childProcess = require('child_process');
  const getAMQPRequest = require('../../router/helpers/requests/amqp');
  const getHTTPRequest = require('../../router/helpers/requests/http');
  const getSocketIORequest = require('../../router/helpers/requests/socketIO');

  let child;
  const childServiceFile = path.resolve(__dirname, '../../fixtures/child-service');

  async function startChildService() {
    const process = childProcess.fork(childServiceFile);

    return new Promise((resolve) => {
      process.on('message', resolve);
    })
      .timeout(60000)
      .then((data) => {
        console.debug('Child started', data);
        return { process, ...data };
      });
  }

  async function getChildServiceConnectors() {
    const service = new Mservice({
      name: 'requester',
      plugins: ['amqp', 'logger', 'validator'],
      amqp: {
        transport: {
          connection: {
            host: 'rabbitmq',
          },
          timeout: 6996,
        },
      },
    });
    await service.connect();

    const socketIOClient = SocketIOClient(`http://0.0.0.0:${child.port}`, {
      forceNew: true,
    });

    return {
      amqp: getAMQPRequest(service.amqp),
      http: getHTTPRequest({ url: `http://0.0.0.0:${child.port}` }),
      socketIO: getSocketIORequest(socketIOClient),
    }
  }

  async function killChildService() {
    await Promise.delay(200);
    child.process.kill('SIGTERM');
  }


  beforeEach('start Child Service', async () => {
    child = await startChildService();
  });

  it('should wait for requests and not respond for amqp request when shutting down', async function () {
    const serviceConnector = await getChildServiceConnectors();

    const reqFn = async () => {
      return serviceConnector.amqp('amqp.action.long-running', {
        pause: 999,
      });
    };

    const ignoredFn = async() => {
      await Promise.delay(600);
      return serviceConnector
        .amqp('amqp.action.long-running', {
          pause: 0,
        })
        .tap((response) => {
          assert.ifError(response, 'should be no response');
        })
        .catch((e) => {
          assert.ok(e, 'should be timeout error');
          assert(e.name === 'TimeoutError');
        });
    };

    const [serviceResponse] = await Promise.all([ reqFn(), ignoredFn(), killChildService() ]);

    assert(serviceResponse, 'should respond to action');
    assert(serviceResponse.success);

  });

  it('should wait for requests and not respond for http request when shutting down', async function () {
    const serviceConnector = await getChildServiceConnectors();

    const reqFn = async () => {
      return serviceConnector.http('/action.long-running', {
        pause: 1000,
      });
    };

    const ignoredFn = async() => {
      await Promise.delay(600);
      return serviceConnector
        .http('/action.long-running', {
          pause: 777,
        })
        .then((response) => {
          assert.ifError(response, 'should be no response');
        }).catch((e) => {
          assert.ok(e, 'should be request error');
          assert(e.name === 'RequestError');
          return { none: 1};
        })
    };

    const [serviceResponse] = await Promise.all([ reqFn(), killChildService(), ignoredFn() ]);
    assert(serviceResponse, 'should respond to action');
    assert(serviceResponse.success);

  });

  it('should wait for socketIO request', async function () {
    const serviceConnector = await getChildServiceConnectors();

    const reqFnSocket = async () => {
      return serviceConnector.socketIO('action.long-running', {
        pause: 500,
      });
    };

    const reqFnHttp = async () => {
      return serviceConnector.http('/action.long-running', {
        pause: 1000,
      });
    };

    const [serviceResponseSocket, serviceResponseHttp] = await Promise.all([reqFnSocket(), reqFnHttp(), killChildService() ]);

    assert(serviceResponseSocket, 'should respond to action');
    assert(serviceResponseSocket.success);
    assert(serviceResponseHttp, 'should respond to action');
    assert(serviceResponseHttp.success);
  });
});
