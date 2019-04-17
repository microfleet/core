import Bluebird = require('bluebird')
import get = require('get-value')
import is = require('is')
import noop = require('lodash/noop')
import { ActionTransport } from '../../..'
import { ServiceRequestInterface } from '../../../types'
import { Router } from '../../router/factory'
import { kReplyHeaders } from '@microfleet/transport-amqp/lib/constants'
import { ServiceRequest } from '../../../utils/service-request'

// cached var
const { amqp } = ActionTransport

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
    const serviceRequest = new ServiceRequest(
      '',
      params,
      properties,
      Object.create(null),
      amqp as ServiceRequestInterface['method'],
      amqp,
      Object.create(null),
      noop as any,
      Object.create(null),
      undefined,
      raw.span,
      console as any
    )

    raw.properties[kReplyHeaders] = serviceRequest.getResponseHeaders()

    const promise = dispatch(actionName, serviceRequest)
    const wrappedDispatch = (wrapDispatch as any)(promise, actionName, raw)

    // promise or callback
    return wrappedDispatch.asCallback(next)
  }
}

export default getAMQPRouterAdapter
