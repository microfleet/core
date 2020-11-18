// @todo tests from old lifecycle
import { upperFirst } from 'lodash'

export interface RunnerConfig {
  context: any
}

export type RunnerHandler = (this: any, params: any, ...rest: any[]) => PromiseLike<void>

export interface Params {
  error?: unknown
}

export default class Runner {
  protected map: Map<string, Set<RunnerHandler>> = new Map()

  protected context: any

  constructor({ context }: RunnerConfig) {
    this.context = context
  }

  register(id: string, handler: RunnerHandler): void {
    let handlers = this.map.get(id)

    if (handlers === undefined) {
      handlers = new Set()
      this.map.set(id, handlers)
    }

    handlers.add(handler)
  }

  async run(id: string, handler: RunnerHandler, params: Params, ...rest: any[]): Promise<void> {
    const uppercased = upperFirst(id)
    const pre = `pre${uppercased}`
    const preHandlers = this.map.get(pre)

    if (preHandlers !== undefined) {
      for (const preHandler of preHandlers) {
        await preHandler.call(this.context, params)
      }
    }

    try {
      await handler.call(this.context, params, ...rest)
    } catch (error: unknown) {
      params.error = error
    }

    const post = `post${uppercased}`
    const postHandlers = this.map.get(post)

    if (postHandlers !== undefined) {
      for (const postHandler of postHandlers) {
        await postHandler.call(this.context, params)
      }
    }

    if (params.error !== undefined) {
      throw params.error
    }
  }
}
