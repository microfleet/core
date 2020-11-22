import * as Bluebird from 'bluebird'
import * as is from 'is'
import { noop } from 'lodash'
import { Microfleet } from '@microfleet/core'
import { RouterPlugin, ActionTransport, ServiceRequest } from '@microfleet/plugin-router'

import { RouterAMQPPluginConfig } from './types/plugin'

function getAMQPRouterAdapter(
  service: Microfleet & RouterPlugin,
  config: RouterAMQPPluginConfig,
  // @todo type
  onComplete?: any
): (params: any, properties: any, next: (...args: any[]) => void) => Promise<void> {
  const { router } = service
  const { requestCountTracker } = router

  // @todo or not todo
  const wrapDispatch = is.fn(onComplete)
    ? (promise: Bluebird<any>, actionName: string, raw: any): Bluebird<any> => promise
      .reflect()
      .then((fate) => {
        const err = fate.isRejected() ? fate.reason() : null
        const data = fate.isFulfilled() ? fate.value() : null
        return onComplete?.call(service, err, data, actionName, raw)
      })
    : (promise: Bluebird<any>): Bluebird<any> => promise

  const decreaseCounter = (): void => requestCountTracker.decrease(ActionTransport.amqp)
  const increaseCounter = (): void => requestCountTracker.increase(ActionTransport.amqp)

  // pre-wrap the function so that we do not need to actually do fromNode(next)
  const dispatch = Bluebird.promisify(router.dispatch, { context: router })
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
    }

    increaseCounter()
    try {
      const promise = dispatch(opts)
      const response = await wrapDispatch(promise, route, raw)

      setImmediate(next, null, response)
    } catch (e) {
      setImmediate(next, e)
    }
    setImmediate(decreaseCounter)
  }
}

export default getAMQPRouterAdapter
