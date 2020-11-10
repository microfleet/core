import Bluebird = require('bluebird')
import get = require('get-value')
import is = require('is')
import noop = require('lodash/noop')
import { ActionTransport } from '@microfleet/utils'
import type { Microfleet } from '@microfleet/core-types'
import type { Router } from '@microfleet/core/lib/plugins/router/factory'
import type { ServiceRequest } from '@microfleet/core-types'

import { RouterAMQPPluginConfig } from './types/plugin'

function getAMQPRouterAdapter(
  router: Router,
  config: RouterAMQPPluginConfig,
  onComplete?: (this: Microfleet, err: Error | null | undefined, data: any, actionName: string, raw: any) => Promise<any>
): (params: any, properties: any, next: (...args: any[]) => void) => Promise<void> {
  const { service, requestCountTracker } = router

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
  const prefix = get(config, 'prefix', '')
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
    const actionName = normalizeActionName(routingKey)

    const opts: ServiceRequest = {
      // initiate action to ensure that we have prepared proto fo the object
      // input params
      // make sure we standardize the request
      // to provide similar interfaces
      params,
      action: noop as any,
      headers: properties,
      locals: Object.create(null),
      log: console as any,
      method: ActionTransport.amqp as ServiceRequest['method'],
      parentSpan: raw.span,
      query: Object.create(null),
      route: '',
      span: undefined,
      transport: ActionTransport.amqp,
      transportRequest: Object.create(null),
    }

    increaseCounter()
    try {
      const promise = dispatch(actionName, opts)
      const response = await wrapDispatch(promise, actionName, raw)
      setImmediate(next, null, response)
    } catch (e) {
      setImmediate(next, e)
    }
    setImmediate(decreaseCounter)
  }
}

export default getAMQPRouterAdapter
