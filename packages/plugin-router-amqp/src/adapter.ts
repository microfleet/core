import { noop, isFunction, identity } from 'lodash'
import { Microfleet } from '@microfleet/core'
import { ActionTransport, ServiceRequest } from '@microfleet/plugin-router'

import { RouterAMQPPluginConfig } from './types/plugin'

function getAMQPRouterAdapter(
  service: Microfleet,
  config: RouterAMQPPluginConfig,
  onComplete?: (this: Microfleet, err: Error | null | undefined, data: any, actionName: string, raw: any) => Promise<any>
): (params: any, properties: any, next: (...args: any[]) => void) => Promise<void> {
  const { router } = service
  const { requestCountTracker } = router

  // @todo or not todo
  const wrapDispatch = isFunction(onComplete)
    ? async (promise: Promise<any>, actionName: string, raw: any): Promise<any> => {
        let data: any = null
        let err: Error | null = null
        try {
          data = await promise
        } catch (e) {
          err = e
        }

        return onComplete.call(service, err, data, actionName, raw)
      }
    : identity

  const decreaseCounter = (): void => requestCountTracker.decrease(ActionTransport.amqp)
  const increaseCounter = (): void => requestCountTracker.increase(ActionTransport.amqp)

  const prefix = config.prefix || ''
  const prefixLength = prefix ? prefix.length + 1 : 0
  const normalizeActionName = prefixLength > 0
    ? (routingKey: string): string => (
      routingKey.startsWith(prefix)
        ? routingKey.substr(prefixLength)
        : routingKey
    )
    : (routingKey: string): string => routingKey

  return async (params: any, properties: any, raw: any, next: (...args: any[]) => void = noop): Promise<any> => {
    const routingKey = properties.headers['routing-key'] || properties.routingKey
    // @todo is it possible to route without prefix trim?
    const route = normalizeActionName(routingKey)

    const opts: ServiceRequest = {
      // initiate action to ensure that we have prepared proto fo the object
      // input params
      // make sure we standardize the request
      // to provide similar interfaces
      params,
      route,
      // @todo fix type for action (optional?)
      action: noop as any,
      headers: properties,
      locals: Object.create(null),
      log: console as any,
      method: ActionTransport.amqp,
      parentSpan: raw.span,
      query: Object.create(null),
      span: undefined,
      transport: ActionTransport.amqp,
      transportRequest: Object.create(null),
      reformatError: true,
    }

    increaseCounter()
    try {
      const promise = service.router.dispatch(opts)
      const response = await wrapDispatch(promise, route, raw)
      next(null, response)
    } catch (e) {
      next(e)
    } finally {
      decreaseCounter()
    }
  }
}

export default getAMQPRouterAdapter
