import { delay, TimeoutError } from 'bluebird'
import { resolve } from 'path'
import { strict as assert } from 'assert'
import split2 = require('split2')
import { once } from 'events'
import getFreePort = require('get-port')
import { io } from 'socket.io-client'
import { Microfleet } from '@microfleet/core'
import Bluebird = require('bluebird')
import execa = require('execa')

import {
  getHTTPRequest,
  getSocketioRequest
} from '../artifacts/utils'

const debug = require('debug')('test')
const childServiceFile = resolve(__dirname, '../artifacts/child-service.ts')

class ChildServiceRunner {
  protected cmd: string
  protected serviceStarted: boolean
  protected stdout: string[]
  protected stderr: string[]
  protected processClosed?: Promise<any[]>
  protected process?: execa.ExecaChildProcess
  protected port?: number
  public exchange = ''
  public receivedCloseSignal = false

  constructor(command: string) {
    this.cmd = command
    this.serviceStarted = false
    this.stdout = []
    this.stderr = []
  }

  async start(): Promise<any> {
    const freePort = await getFreePort()
    const args = ['-r', '@swc-node/register', '-r', 'tsconfig-paths/register', this.cmd, String(freePort)]

    debug('node %s', args.join(' '))

    const proc = execa('node', args, {
      buffer: false,
      env: { SWC_NODE_PROJECT: './tsconfig.test.json' },
    })

    debug('spawned')

    const { stderr, stdout } = proc
    stderr?.pipe(process.stderr)

    stdout?.pipe(split2()).on('data', (line: string): void => {
      // in case of emergency uncomment
      // eslint-disable-next-line no-console
      // console.info(line)
      process.stdout.write(line)
      process.stdout.write('\n')
      if (line.includes('childServiceReady')) {
        this.serviceStarted = true
        this.exchange = JSON.parse(line).amqp
        proc.emit('ready')
      } else if (line.includes('received close signal')) {
        this.receivedCloseSignal = true
        proc.emit('receivedCloseSignal')
      }
    })

    await Promise.race([
      Bluebird.delay(15000).throw(new TimeoutError('child process isnt ready after 15s')),
      proc,
      once(proc, 'ready')
    ])

    this.process = proc
    this.port = freePort

    return { process: proc, port: freePort, exchange: this.exchange }
  }

  async getServiceConnectors(opts = {}): Promise<any> {
    const service = new Microfleet({
      name: 'requester',
      plugins: ['amqp', 'logger', 'validator'],
      logger: {
        defaultLogger: false,
      },
      amqp: {
        transport: {
          connection: {
            host: 'rabbitmq',
          },
          timeout: 6996,
          exchange: this.exchange,
        },
      },
    })

    await service.connect()

    const socket = io(`http://0.0.0.0:${this.getPort()}`, {
      forceNew: true,
      autoConnect: false,
      transports: ['websocket'],
      timeout: 1000,
      reconnection: false,
    })

    socket.connect()
    await once(socket, 'connect')

    return {
      service,
      socketioClient: socket,
      http: getHTTPRequest({ url: `http://0.0.0.0:${this.getPort()}` }),
      socketio: getSocketioRequest(socket, opts),
    }
  }

  async kill(signal = 'SIGTERM', wait = false) {
    assert(this.serviceStarted, 'No service started')
    assert(this.process, 'No service started')

    if (wait) await delay(500)

    this.process.kill(signal, {
      forceKillAfterTimeout: 50000,
    })

    await this.process
  }

  getPort() {
    assert(this.serviceStarted, 'No service started')
    return this.port
  }
}

jest.setTimeout(1000 * 20 * 3)

describe('service graceful shutdown', () => {
  let childService: ChildServiceRunner

  beforeEach(async () => {
    debug('spawning process')
    childService = new ChildServiceRunner(childServiceFile)
    await childService.start()
    debug('process spawned')
  })

  it('receives SIGTERM event', async () => {
    await childService.kill('SIGTERM')
    assert(childService.receivedCloseSignal)
  })

  it('receives SIGINT event', async () => {
    await childService.kill('SIGINT')
    assert(childService.receivedCloseSignal)
  })

  it('should wait for amqp request when shutting down', async () => {
    const serviceConnector = await childService.getServiceConnectors()

    try {
      const [serviceResponse] = await Promise.all([
        serviceConnector.service.amqp.publishAndWait('amqp.action.long-running', { pause: 999 }),
        Bluebird.delay(100).then(() => childService.kill('SIGTERM', true)),
      ])

      assert(serviceResponse, 'should respond to action')
      assert(serviceResponse.success)
    } finally {
      await serviceConnector.service.close()
      serviceConnector.socketioClient.close()
    }
  })

  it('should wait for http request when shutting down', async () => {
    const serviceConnector = await childService.getServiceConnectors()

    try {
      const [serviceResponse] = await Promise.all([
        serviceConnector.http('/action.long-running', { pause: 1000 }),
        childService.kill('SIGTERM', true),
      ])

      assert(serviceResponse, 'should respond to action')
      assert(serviceResponse.success)
    } finally {
      await serviceConnector.service.close()
      serviceConnector.socketioClient.close()
    }
  })

  it('should wait for socket.io request', async () => {
    const serviceConnector = await childService.getServiceConnectors()

    try {
      const [serviceResponseSocket] = await Promise.all([
        serviceConnector.socketio('action.long-running', { pause: 500 }),
        childService.kill('SIGTERM', true),
      ])

      assert(serviceResponseSocket, 'should respond to action')
      assert(serviceResponseSocket.success)
    } finally {
      await serviceConnector.service.close()
      serviceConnector.socketioClient.close()
    }
  })

  it('should wait for multiple requests to finish', async () => {
    const serviceConnector = await childService.getServiceConnectors({ ignoreDisconnect: { success: true, disconnected: true } })
    const actions = [
      () => serviceConnector.service.amqp.publishAndWait('amqp.action.long-running', { pause: 299, timeout: 1000 }),
      () => serviceConnector.http('/action/long-running', { pause: 500 }),
      () => serviceConnector.socketio('action.long-running', { pause: 500 }),
    ]

    try {
      debug('starting requests')

      const responses = await Promise.all([
        ...Array.from({ length: 100 })
          .map(() => Math.floor(Math.random() * actions.length))
          .map((i) => actions[i]()),
        childService.kill('SIGTERM', true),
      ])

      debug('responses received')

      responses.pop()
      responses.every((resp) => {
        debug(resp)
        assert(resp, 'should respond to action')
        assert(resp.success, 'success isnt true')
        return true
      })

      debug('how many disconnects?', responses.filter(resp => resp.disconnected).length)
      assert(responses.filter(resp => resp.disconnected).length < 0.15 * responses.length, 'too many disconnected requests')
    } finally {
      debug('closing socketio & service connector')
      await serviceConnector.service.close()
      serviceConnector.socketioClient.close()
    }
  })
})
