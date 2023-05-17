import { sep, resolve } from 'path'
import { glob } from 'glob'
import { ValidationError } from 'common-errors'

import { ServiceAction } from './types/router'

export async function readRoutes(directory: string): Promise<[string, ServiceAction][]> {
  const files = await glob('*.{js,ts}', {
    cwd: directory,
    matchBase: true,
    ignore: ['*.d.ts']
  })

  return files.map((file) => {
    // remove .js/.ts from route
    const route = file.slice(0, -3)
    // replace / with . for route
    const routeKey = route.split(sep).join('.')

    return [routeKey, requireServiceActionHandler(resolve(directory, file))]
  })
}

export const transformFileToAction = (input: any, handler?: any): ServiceAction => {
  const props = Object.getOwnPropertyNames(input)
  const action = Object.create(null)
  for (const prop of props) {
    action[prop] = input[prop]
  }

  if (handler) {
    action.handler = handler
    const handlerProps = Object.getOwnPropertyNames(handler)
    for (const prop of handlerProps) {
      action[prop] = handler[prop]
    }
  } else {
    action.handler = input
  }

  return action
}

export function requireServiceActionHandler(path: string): ServiceAction {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const baseAction = require(path)

  if (typeof baseAction === 'function') {
    return transformFileToAction(baseAction)
  }

  if (baseAction && typeof baseAction.default === 'function') {
    return transformFileToAction(baseAction, baseAction.default)
  }

  throw new Error(`action from ${path} must be a function`)
}

export function createServiceAction(route: string, action: ServiceAction): ServiceAction {
  const { allowed, auth, schema, transports } = action

  action.actionName = route

  if (action.schema === undefined) {
    action.schema = route
  }

  if (action.responseSchema === undefined) {
    action.responseSchema = `response.${action.actionName}`
  }

  if (allowed !== undefined && typeof allowed !== 'function') {
    throw new ValidationError(`action.allowed in ${String(route)} must be a function`)
  }

  if (auth !== undefined && (typeof auth !== 'string' && typeof auth !== 'object')) {
    throw new ValidationError(`action.auth in ${String(route)} must be a string or an object`)
  }

  if (schema !== undefined && typeof schema !== 'string' && schema !== null && schema !== false) {
    throw new ValidationError(`action.schema in ${String(route)} must be a string`)
  }

  if (transports !== undefined && !Array.isArray(transports)) {
    throw new ValidationError(`action.transports in ${String(route)} must be an array`)
  }

  return action
}
