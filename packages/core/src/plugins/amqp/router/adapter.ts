import Bluebird = require('bluebird')
import get = require('get-value')
import is = require('is')
import noop = require('lodash/noop')
import { ActionTransport } from '../../..'
import { ServiceRequest } from '../../../types'
import { Router } from '../../router/factory'

// cached var
const { amqp } = ActionTransport

type onCompleteCallback = (promise: Bluebird<any>, actionName: string, raw: any) => Bluebird<any>

function getAMQPRouterAdapter(router: Router, config: any) {
  const { onComplete } = config.transport
  const { service } = router
  const wrapDispatch = is.fn(onComplete)
    ? (promise: Bluebird<any>, actionName: string, raw: any) => promise
      .reflect()
      .then((fate) => {
        const err = fate.isRejected() ? fate.reason() : null
        const data = fate.isFulfilled() ? fate.value() : null
        return onComplete.call(service, err, data, actionName, raw)
      })
    : (promise: Bluebird<any>) => promise

  const decreaseCounter = () => router.requestCountTracker.decrease(amqp)
  const countRequests = (fn: onCompleteCallback) => (promise: Bluebird<any>, actionName: string, raw: any) => (
    fn(promise, actionName, raw).tap(decreaseCounter).tapCatch(decreaseCounter)
  )

  // pre-wrap the function so that we do not need to actually do fromNode(next)
  const dispatch = Bluebird.promisify(router.dispatch, { context: router })
  const prefix = get(config, 'router.prefix', '')
  const prefixLength = prefix ? prefix.length + 1 : 0
  const normalizeActionName = prefixLength > 0
    ? (routingKey: string) => (
      routingKey.startsWith(prefix)
        ? routingKey.substr(prefixLength)
        : routingKey
    )
    : (routingKey: string) => routingKey

  return function AMQPRouterAdapter(params: any, properties: any, raw: any, next?: () => any) {
    const routingKey = properties.headers['routing-key'] || properties.routingKey
    const actionName = normalizeActionName(routingKey)

    router.requestCountTracker.increase(amqp)

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
      method: amqp as ServiceRequest['method'],
      parentSpan: raw.span,
      query: Object.create(null),
      route: '',
      span: undefined,
      transport: amqp,
      transportRequest: Object.create(null),
    }

    const promise = dispatch(actionName, opts)
    const wrappedWithConnCounter = countRequests(wrapDispatch)
    const wrappedDispatch = (wrappedWithConnCounter as any)(promise, actionName, raw)

    // promise or callback
    return wrappedDispatch.asCallback(next)
  }
}

export default getAMQPRouterAdapter
