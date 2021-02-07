import { sep, resolve } from 'path'
import Bluebird from 'bluebird'
import glob = require('glob')
import { Tags, Span } from 'opentracing'
import { isObject, isString } from 'lodash'
import { ValidationError } from 'common-errors'

import { ServiceAction } from './types/router'

const { ERROR } = Tags
const filterDefinitions = (x: string) => !x.endsWith('.d.ts')

export function wrapPromiseWithSpan(
  span: Span,
  promise: Bluebird<any>,
  callback?: (err: any, result?: any) => void
): void {
  promise
    .catch((err: Error) => {
      span.setTag(ERROR, true)
      span.log({
        'error.object': err,
        event: 'error',
        message: err.message,
        stack: err.stack,
      })

      throw err
    })
    .finally(() => {
      span.finish()
    })
    .asCallback(callback)
}

export function readRoutes(directory: string): [string, ServiceAction][] {
  return glob
    .sync('*.{js,ts}', { cwd: directory, matchBase: true })
    .filter(filterDefinitions)
    .map((file) => {
      // remove .js/.ts from route
      const route = file.slice(0, -3)
      // replace / with . for route
      const routeKey = route.split(sep).join('.')

      return [routeKey, requireServiceActionHandler(resolve(directory, file))]
    })
}

export function requireServiceActionHandler(path: string): ServiceAction {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const handler = require(path) as ServiceAction | { default: ServiceAction }

  if (typeof handler === 'function') {
    return handler
  }

  if (isObject(handler) && typeof handler.default === 'function') {
    return handler.default
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

  if (auth !== undefined && (isString(auth) || isObject(auth)) !== true) {
    throw new ValidationError(`action.auth in ${String(route)} must be a string or an object`)
  }

  if (schema !== undefined && !isString(schema) && schema !== null && schema !== false) {
    throw new ValidationError(`action.schema in ${String(route)} must be a string`)
  }

  if (transports !== undefined && !Array.isArray(transports)) {
    throw new ValidationError(`action.transports in ${String(route)} must be an array`)
  }

  return action
}
