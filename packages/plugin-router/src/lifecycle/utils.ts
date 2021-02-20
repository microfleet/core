import { Microfleet } from '@microfleet/core'

import type { Hook, Hooks } from './'
import type { ServiceRequest, ServiceMiddleware } from '../types/router'

export async function runHook(
  hooks: Hooks,
  hook: Hook,
  context: Microfleet,
  request: ServiceRequest
): Promise<void> {
  const handlers = hooks.get(hook)

  if (handlers !== undefined) {
    for (const handler of handlers) {
      await handler.call(context, request)
    }
  }
}

export async function runHandler(
  handler: ServiceMiddleware,
  hooks: Hooks,
  preHook: Hook,
  postHook: Hook,
  context: Microfleet,
  request: ServiceRequest
): Promise<void> {
  await runHook(hooks, preHook, context, request)

  try {
    await handler.call(context, request)
  } catch (error: any) {
    request.error = error
  }

  await runHook(hooks, postHook, context, request)

  const onRequestError = request.error

  if (onRequestError !== undefined) {
    throw onRequestError
  }
}
