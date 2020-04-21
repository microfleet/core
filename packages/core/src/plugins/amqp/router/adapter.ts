import Bluebird = require('bluebird')
import get = require('get-value')
import is = require('is')
import noop = require('lodash/noop')
import { ActionTransport } from '../../..'
import { Router } from '../../router/factory'
import { kReplyHeaders } from '@microfleet/transport-amqp/lib/constants'
import { createServiceRequest } from './service-request-factory'

// cached var
const { amqp } = ActionTransport

function getAMQPRouterAdapter(router: Router, config: any) {
  const { onComplete } = config.transport
  const { service, requestCountTracker } = router
  const wrapDispatch = is.fn(onComplete)
    ? (promise: Bluebird<any>, actionName: string, raw: any): Bluebird<any> => promise
      .reflect()
      .then((fate) => {
        const err = fate.isRejected() ? fate.reason() : null
        const data = fate.isFulfilled() ? fate.value() : null
        return onComplete.call(service, err, data, actionName, raw)
      })
    : (promise: Bluebird<any>): Bluebird<any> => promise

  const decreaseCounter = (): void => requestCountTracker.decrease(amqp)
  const increaseCounter = (): void => requestCountTracker.increase(amqp)

  // pre-wrap the function so that we do not need to actually do fromNode(next)
  const dispatch = Bluebird.promisify(router.dispatch, { context: router })
  const prefix = get(config, 'router.prefix', '')
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

    const serviceRequest = createServiceRequest(properties, params, raw.span);

    increaseCounter()
    try {
      const promise = dispatch(actionName, serviceRequest)
        .finally(() => {
          raw.properties[kReplyHeaders] = Object.fromEntries(serviceRequest.getReplyHeaders())
        });
      const response = await wrapDispatch(promise, actionName, raw)
      setImmediate(next, null, response)
    } catch (e) {
      setImmediate(next, e)
    }
    setImmediate(decreaseCounter)
  }
}

export default getAMQPRouterAdapter
