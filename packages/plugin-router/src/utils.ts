import { sep, resolve } from 'node:path'
import { glob } from 'glob'
import { ValidationError } from 'common-errors'

import { ServiceAction } from './types/router'

export async function readRoutes(directory: string): Promise<[string, ServiceAction][]> {
  const files = await glob('*.{js,ts,mjs,mts,cjs,cts}', {
    cwd: directory,
    matchBase: true,
    ignore: ['*.d.ts', '**/*.d.ts', '*.d.mts', '**/*.d.mts', '*.d.cts', '**/*.d.cts']
  })


  const routes: [string, ServiceAction][] = []

  for (const file of files) {
    // remove .js/.ts from route
    const route = file.slice(0, -3)
    // replace / with . for route
    const routeKey = route.split(sep).join('.')

    // rename .cts and .mts -> cjs / mjs
    if (file.endsWith('.mts')) {
    //   file = file.replace(/\.(c|m)ts$/, '.$1js')
      continue
    }


    routes.push([
      routeKey,
      await requireServiceActionHandler(resolve(directory, file))
    ])
  }

  return routes
}

export const transformFileToAction = (input: any, handler?: any): ServiceAction => {
  const omitProps = ['length', 'name', 'default', '__esModule']
  const props = Object.getOwnPropertyNames(input)
  const action = Object.create(null)
  for (const prop of props) {
    if (!omitProps.includes(prop)) {
      action[prop] = input[prop]
    }
  }

  if (handler) {
    action.handler = handler
    const handlerProps = Object.getOwnPropertyNames(handler)
    for (const prop of handlerProps) {
      if (!omitProps.includes(prop)) {
        action[prop] = handler[prop]
      }
    }
  } else {
    action.handler = input
  }

  return action
}

export async function requireServiceActionHandler(path: string): Promise<ServiceAction> {
  const baseAction = await import(path)

  // debug
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
