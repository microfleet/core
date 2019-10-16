const Promise = require('bluebird');
const path = require('path');
const assert = require('assert');
const childProcess = require('child_process');

const getFreePort = require('get-port');
const SocketIOClient = require('socket.io-client');
const { Microfleet: Mservice } = require('../../');

const getAMQPRequest = require('../router/helpers/requests/amqp');
const getHTTPRequest = require('../router/helpers/requests/http');
const getSocketIORequest = require('../router/helpers/requests/socketIO');

const childServiceFile = path.resolve(__dirname, '../fixtures/child-service/index.js');

class ChildServiceRunner {
  constructor(command) {
    this.cmd = command;
    this.serviceStarted = false;
    this.preStartStdout = [];
    this.stdout = [];
    this.preStartStderr = [];
    this.stderr = [];
  }

  async start() {
    const freePort = await getFreePort();

    const subProcess = childProcess.spawn('node', [this.cmd, freePort], {
      detached: true,
      stdio: 'pipe',
      env: { ...process.env, DEBUG: '*' },
    });

    subProcess.stderr.on('data', (data) => {
      const strData = data;
      const buffer = this.serviceStarted ? this.stderr : this.preStartStderr;
      buffer.push(strData);
    });

    this.processClosed = new Promise((resolve, reject) => {
      subProcess.on('close', (code) => {
        if (code > 0) {
          reject(new Error(code));
          return;
        }

        resolve({ code });
      });
    });

    await new Promise((resolve) => {
      subProcess.stdout.on('data', (data) => {
        const strData = data.toString();
        const buffer = this.serviceStarted ? this.stdout : this.preStartStdout;
        buffer.push(strData);

        if (strData.includes('childServiceReady')) {
          this.serviceStarted = true;
          resolve();
        }
      });
    })
      .timeout(60000);

    this.process = subProcess;
    this.port = freePort;
    return { process: subProcess, port: freePort };
  }

  async getServiceConnectors() {
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

    const socketIOClient = SocketIOClient(`http://0.0.0.0:${this.getPort()}`, {
      forceNew: true,
    });

    return {
      amqp: getAMQPRequest(service.amqp),
      http: getHTTPRequest({ url: `http://0.0.0.0:${this.getPort()}` }),
      socketIO: getSocketIORequest(socketIOClient),
    };
  }

  async kill(signal = 'SIGTERM', wait = false) {
    assert(this.serviceStarted, 'No service started');
    if (wait) await Promise.delay(200);
    process.kill(this.process.pid, signal);
  }

  getPort() {
    assert(this.serviceStarted, 'No service started');
    return this.port;
  }

  async getStdout() {
    await this.processClosed;
    return this.stdout;
  }

  async getStderr() {
    await this.processClosed;
    return this.stderr;
  }
}

describe('service graceful shutdown', () => {
  let childService;

  beforeEach('start Child Service', async () => {
    childService = new ChildServiceRunner(childServiceFile);
    await childService.start();
  });

  it('receives SIGTERM event', async () => {
    await childService.kill('SIGTERM');
    const output = await childService.getStdout();

    assert(output.some((s) => s.includes('Bye!...')));
  });

  it('receives SIGINT event', async () => {
    await childService.kill('SIGINT');
    const output = await childService.getStdout();

    assert(output.some((s) => s.includes('Bye!...')));
  });

  it('should wait for amqp request when shutting down', async () => {
    const serviceConnector = await childService.getServiceConnectors();

    const [serviceResponse] = await Promise.all([
      serviceConnector.amqp('amqp.action.long-running', { pause: 999 }),
      childService.kill('SIGTERM', true),
    ]);

    assert(serviceResponse, 'should respond to action');
    assert(serviceResponse.success);
  });

  it('should wait for http request when shutting down', async () => {
    const serviceConnector = await childService.getServiceConnectors();

    const [serviceResponse] = await Promise.all([
      serviceConnector.http('/action.long-running', { pause: 1000 }),
      childService.kill('SIGTERM', true),
    ]);

    assert(serviceResponse, 'should respond to action');
    assert(serviceResponse.success);
  });

  it('should wait for socketIO request', async () => {
    const serviceConnector = await childService.getServiceConnectors();

    const [serviceResponseSocket] = await Promise.all([
      serviceConnector.socketIO('action.long-running', { pause: 500 }),
      childService.kill('SIGTERM', true),
    ]);

    assert(serviceResponseSocket, 'should respond to action');
    assert(serviceResponseSocket.success);
  });

  it('should wait for multiple requests to finish', async () => {
    const serviceConnector = await childService.getServiceConnectors();
    const actions = [
      () => serviceConnector.amqp('amqp.action.long-running', { pause: 999 }),
      () => serviceConnector.http('/action.long-running', { pause: 1000 }),
      () => serviceConnector.socketIO('action.long-running', { pause: 500 }),
    ];

    const responses = await Promise.all([
      ...Array.from({ length: 100 })
        .map(() => Math.floor(Math.random() * actions.length))
        .map((i) => actions[i]()),
      childService.kill('SIGTERM', true),
    ]);

    responses.pop();
    responses.every((resp) => {
      assert(resp, 'should respond to action');
      assert(resp.success);
      return true;
    });
  });
});
