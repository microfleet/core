import { delay, TimeoutError } from 'bluebird'
import { resolve } from 'path'
import { strict as assert } from 'assert'
import { spawn, ChildProcess } from 'child_process'
import * as split2 from 'split2'
import { once } from 'events'
import * as getFreePort from 'get-port'
import * as SocketIOClient from 'socket.io-client'
import { Microfleet } from '@microfleet/core'

import {
  getHTTPRequest,
  getSocketioRequest
} from '../artifacts/utils'

const childServiceFile = resolve(__dirname, '../artifacts/child-service.ts')

class ChildServiceRunner {
  protected cmd: string

  protected serviceStarted: boolean

  protected stdout: string[]

  protected stderr: string[]

  protected processClosed?: Promise<any[]>

  protected process?: ChildProcess

  protected port?: number

  constructor(command: string) {
    this.cmd = command
    this.serviceStarted = false
    this.stdout = []
    this.stderr = []
  }

  async start(): Promise<any> {
    const freePort = await getFreePort()

    // @todo return js file for child-service
    const subProcess = spawn('/src/node_modules/.bin/ts-node', [this.cmd, String(freePort)], {
      detached: true,
      stdio: 'pipe',
      env: { ...process.env, DEBUG: '*' },
    })

    const { stderr, stdout } = subProcess

    stderr.pipe(split2()).on('data', (line: string): void => {
      this.stderr.push(line)
    })

    stdout.pipe(split2()).on('data', (line: string): void => {
      // eslint-disable-next-line no-console
      console.info(line)
      this.stdout.push(line)
      if (line.includes('childServiceReady')) {
        this.serviceStarted = true
        subProcess.emit('ready')
      }
    })

    this.processClosed = once(subProcess, 'close')

    try {
      await Promise.race([
        once(subProcess, 'ready'),
        delay(100000).throw(new TimeoutError()),
      ])
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error(e)
      // eslint-disable-next-line no-console
      console.error(this.stdout.join('\n'))
      throw new Error(this.stderr.join('\n'))
    }

    this.process = subProcess
    this.port = freePort

    return { process: subProcess, port: freePort }
  }

  async getServiceConnectors(): Promise<any> {
    const service = new Microfleet({
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
    })

    await service.connect()

    const socketioClient = SocketIOClient(`http://0.0.0.0:${this.getPort()}`, {
      forceNew: true,
    })

    return {
      amqp: service.amqp.publishAndWait.bind(service.amqp),
      http: getHTTPRequest({ url: `http://0.0.0.0:${this.getPort()}` }),
      socketio: getSocketioRequest(socketioClient),
    }
  }

  async kill(signal = 'SIGTERM', wait = false) {
    assert(this.serviceStarted, 'No service started')
    assert(this.process, 'No service started')
    if (wait) await delay(500)
    process.kill(this.process.pid, signal)
  }

  getPort() {
    assert(this.serviceStarted, 'No service started')
    return this.port
  }

  async getStdout() {
    await this.processClosed
    return this.stdout
  }

  async getStderr() {
    await this.processClosed
    return this.stderr
  }
}

jest.setTimeout(100000)

describe('service graceful shutdown', () => {
  let childService: ChildServiceRunner

  beforeEach(async () => {
    childService = new ChildServiceRunner(childServiceFile)
    await childService.start()
  })

  it('receives SIGTERM event', async () => {
    await childService.kill('SIGTERM')
    const output = await childService.getStdout()

    assert(output.some((s) => s.includes('received close signal')))
  })

  it('receives SIGINT event', async () => {
    await childService.kill('SIGINT')
    const output = await childService.getStdout()

    assert(output.some((s) => s.includes('received close signal')))
  })

  it('should wait for amqp request when shutting down', async () => {
    const serviceConnector = await childService.getServiceConnectors()

    const [serviceResponse] = await Promise.all([
      serviceConnector.amqp('amqp.action.long-running', { pause: 999 }),
      childService.kill('SIGTERM', true),
    ])

    assert(serviceResponse, 'should respond to action')
    assert(serviceResponse.success)
  })

  it('should wait for http request when shutting down', async () => {
    const serviceConnector = await childService.getServiceConnectors()

    const [serviceResponse] = await Promise.all([
      serviceConnector.http('/action.long-running', { pause: 1000 }),
      childService.kill('SIGTERM', true),
    ])

    assert(serviceResponse, 'should respond to action')
    assert(serviceResponse.success)
  })

  it('should wait for socket.io request', async () => {
    const serviceConnector = await childService.getServiceConnectors()

    const [serviceResponseSocket] = await Promise.all([
      serviceConnector.socketio('action.long-running', { pause: 500 }),
      childService.kill('SIGTERM', true),
    ])

    assert(serviceResponseSocket, 'should respond to action')
    assert(serviceResponseSocket.success)
  })

  it('should wait for multiple requests to finish', async () => {
    const serviceConnector = await childService.getServiceConnectors()
    const actions = [
      () => serviceConnector.amqp('amqp.action.long-running', { pause: 299 }),
      () => serviceConnector.http('/action.long-running', { pause: 500 }),
      () => serviceConnector.socketio('action.long-running', { pause: 500 }),
    ]

    const responses = await Promise.all([
      ...Array.from({ length: 100 })
        .map(() => Math.floor(Math.random() * actions.length))
        .map((i) => actions[i]()),
      childService.kill('SIGTERM', true),
    ])

    responses.pop()
    responses.every((resp) => {
      assert(resp, 'should respond to action')
      assert(resp.success)
      return true
    })
  })
})
