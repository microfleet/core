import { describe, it, beforeEach, after } from 'node:test'
import { resolve } from 'node:path'
import { strict as assert } from 'node:assert'
import { setTimeout } from 'node:timers/promises'
import split2 from 'split2'
import { once } from 'node:events'
import getFreePort from 'get-port'
import { io } from 'socket.io-client'
import { Microfleet } from '@microfleet/core'
import { execa, ExecaChildProcess } from 'execa'

import {
  getHTTPRequest,
  getSocketioRequest
} from '../artifacts/utils'
import { getGlobalDispatcher } from 'undici'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const debug = require('debug')('test')
const childServiceFile = resolve(__dirname, '../artifacts/child-service.ts')

class ChildServiceRunner {
  protected cmd: string
  protected serviceStarted: boolean
  protected stdout: string[]
  protected stderr: string[]
  protected processClosed?: Promise<any[]>
  protected abortController?: AbortController
  protected process?: ExecaChildProcess
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
    const args = ['--import', 'tsx', this.cmd, freePort.toString()]

    debug('node %s', args.join(' '))

    const controller = new AbortController()
    const proc = execa('node', args, {
      buffer: false,
      stderr: 'inherit',
      stdout: 'pipe',
      signal: controller.signal,
    })

    debug('spawned')

    proc.stdout?.pipe(split2()).on('data', (line: string): void => {
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

    const timeoutController = new AbortController()
    await Promise.race([
      setTimeout(15000, { signal: timeoutController.signal }).then(() => {
        controller.abort(new Error('child process isnt ready after 15s'))
      }),
      proc,
      once(proc, 'ready')
    ])

    timeoutController.abort()
    this.abortController = controller
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
    // @ts-expect-error invalid typings
    await once(socket, 'connect')

    return {
      service,
      socketioClient: socket,
      http: getHTTPRequest({ url: `http://0.0.0.0:${this.getPort()}` }),
      socketio: getSocketioRequest(socket, opts),
    }
  }

  async kill(signal: NodeJS.Signals = 'SIGTERM', wait = false) {
    assert(this.serviceStarted, 'No service started')
    assert(this.process, 'No service started')

    if (wait) await setTimeout(500)

    this.process.kill(signal, {
      forceKillAfterTimeout: 2000
    })

    await this.process
  }

  getPort() {
    assert(this.serviceStarted, 'No service started')
    return this.port
  }
}

describe('service graceful shutdown', async () => {
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
        setTimeout(100).then(async () => {
          await childService.kill('SIGTERM', true)
        }),
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
        childService.kill('SIGTERM', true)
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
        childService.kill('SIGTERM', true)
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
        childService.kill('SIGTERM', true)
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

  after(async () => {
    await getGlobalDispatcher().close()
  })
})
