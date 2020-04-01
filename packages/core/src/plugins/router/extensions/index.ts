import Bluebird = require('bluebird')
import Errors = require('common-errors')
import is = require('is')
import { literal } from '../../../constants'
import { $Values } from '../../../types'

export const LifecyclePoints = {
  preAllowed: literal('preAllowed'),
  postAllowed: literal('postAllowed'),
  preAuth: literal('preAuth'),
  postAuth: literal('postAuth'),
  preHandler: literal('preHandler'),
  postHandler: literal('postHandler'),
  preRequest: literal('preRequest'),
  postRequest: literal('postRequest'),
  preResponse: literal('preResponse'),
  postResponse: literal('postResponse'),
  preValidate: literal('preValidate'),
  postValidate: literal('postValidate'),
}

export type LifecycleRequestType = $Values<typeof LifecyclePoints>

/**
 * Type definitions
 */
export interface ExtensionPlugin {
  point: LifecycleRequestType;
  handler(...args: any[]): PromiseLike<any>;
}

export interface ExtensionsConfig {
  enabled: LifecycleRequestType[];
  register: ExtensionPlugin[][];
}

const toArray = <T>(arg: T) => Array.isArray(arg) ? arg : [arg]

function walkOverHandlers(this: any, previousArgs: any, handler: (...args: any[]) => any) {
  return handler.apply(this, toArray(previousArgs))
}

/**
 * @class Extensions
 * @param config - Extensions configuration object.
 * @param config.enabled - Enabled lifecycle events.
 * @param config.register - Extensions to register.
 */
class Extensions {
  public extensions: {
    [extensionName: string]: ExtensionPlugin['handler'][];
  }

  constructor(config: ExtensionsConfig = { enabled: [], register: [] }) {
    const { enabled, register } = config
    const extensions = Object.create(null)

    for (const extension of enabled) {
      extensions[extension] = []
    }

    this.extensions = extensions
    this.autoRegister(register)
  }

  public autoRegister(register: ExtensionPlugin[][]) {
    for (const extensions of register) {
      for (const extension of extensions) {
        this.register(extension.point, extension.handler)
      }
    }
  }

  /**
   * Checks for existence of the extension handler name.
   * @param name - Name of the extension handler.
   * @returns True if exists.
   */
  public has(name: LifecycleRequestType) {
    const handlers = this.extensions[name]
    return handlers !== undefined && handlers.length > 0
  }

  /**
   * Registeres handler of the lifecycle event.
   * @param {string} name - Name of the lifecycle event.
   * @param {Function} handler - Handler of the event.
   */
  public register(name: LifecycleRequestType, handler: (...args: any[]) => PromiseLike<any | never>) {
    if (this.extensions[name] === undefined) {
      throw new Errors.NotSupportedError(name)
    }

    this.extensions[name].push(handler)
  }

  /**
   * Executes handlers for the lifecycle event.
   * @param name - Name of the lifecycle event.
   * @param args - Arguments to pass to lifecycle handlers.
   * @param [context=null] - Context to call lifecycle handlers with.
   * @returns Result of the invocation.
   */
  public exec(name: string, args: any[] = [], context: any = null) {
    const handlers = this.extensions[name]

    if (is.undefined(handlers)) {
      return Bluebird.reject(new Errors.NotSupportedError(name))
    }

    if (!Array.isArray(args)) {
      return Bluebird.reject(new Errors.ArgumentError('"args" must be array'))
    }

    return Bluebird
      .resolve(handlers)
      .bind(context)
      .reduce(walkOverHandlers, args)
      .then(toArray)
  }
}

export default Extensions
