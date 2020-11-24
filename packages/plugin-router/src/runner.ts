import { upperFirst } from 'lodash'

export interface RunnerConfig {
  context?: any
}

export interface RunnerFn<P> {
  (this: any, params: P, ...rest: any[]): Promise<void>
}

export interface RunnerParams {
  error?: any
}

export default class Runner<F extends RunnerFn<P>, P extends RunnerParams> {
  protected map: Map<string, Set<F>> = new Map()

  protected context: any

  constructor(config?: RunnerConfig) {
    if (config !== undefined) {
      this.context = config.context
    }
  }

  register(id: string, handler: F): void {
    let handlers = this.map.get(id)

    if (handlers === undefined) {
      handlers = new Set()
      this.map.set(id, handlers)
    }

    handlers.add(handler)
  }

  async run(id: string, params: P): Promise<void> {
    const handlers = this.map.get(id)

    if (handlers !== undefined) {
      for (const handler of handlers) {
        await handler.call(this.context, params)
      }
    }
  }

  async runFn(name: string, handler: F, params: P, ...rest: any[]): Promise<void> {
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
