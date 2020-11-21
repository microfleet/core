// @todo tests from old lifecycle
import { upperFirst } from 'lodash'

export interface RunnerConfig {
  context?: any
}

export interface RunnerFn {
  // @todo params: RunnerParams
  (this: any, params: any, ...rest: any[]): PromiseLike<void>
}

export interface RunnerParams {
  error?: any
}

export default class Runner {
  protected map: Map<string, Set<RunnerFn>> = new Map()

  protected context: any

  constructor(config?: RunnerConfig) {
    if (config !== undefined) {
      this.context = config.context
    }
  }

  register(id: string, handler: RunnerFn): void {
    let handlers = this.map.get(id)

    if (handlers === undefined) {
      handlers = new Set()
      this.map.set(id, handlers)
    }

    handlers.add(handler)
  }

  async run(id: string, params: RunnerParams): Promise<void> {
    const handlers = this.map.get(id)

    if (handlers !== undefined) {
      for (const handler of handlers) {
        await handler.call(this.context, params)
      }
    }
  }

  async runFn(name: string, handler: RunnerFn, params: RunnerParams, ...rest: any[]): Promise<void> {
    const uppercased = upperFirst(name)

    await this.run(`pre${uppercased}`, params)

    try {
      await handler.call(this.context, params, ...rest)
    } catch (error: unknown) {
      params.error = error
    }

    await this.run(`post${uppercased}`, params)

    if (params.error !== undefined) {
      throw params.error
    }
  }
}
