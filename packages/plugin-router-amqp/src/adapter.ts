import { noop, identity } from 'lodash'
import { Microfleet } from '@microfleet/core'
import { ActionTransport, ServiceRequest } from '@microfleet/plugin-router'
import { MessageConsumer } from '@microfleet/transport-amqp'
import { RouterAMQPPluginConfig } from './types/plugin'
import { Message } from '@microfleet/amqp-coffee'

function getAMQPRouterAdapter(
  service: Microfleet,
  config: RouterAMQPPluginConfig,
  onComplete?: (this: Microfleet, err: Error | null | undefined, data: any, actionName: string, raw: Message) => Promise<any>
): MessageConsumer {
  // @todo or not todo
  const wrapDispatch = typeof onComplete === 'function'
    ? async (promise: Promise<any>, actionName: string, raw: Message): Promise<any> => {
        let data: any = null
        let err: Error | null = null
        try {
          data = await promise
        } catch (e: any) {
          err = e
        }

        return onComplete.call(service, err, data, actionName, raw)
      }
    : identity


  const prefix = config.prefix || ''
  const prefixLength = prefix ? prefix.length + 1 : 0
  const normalizeActionName = prefixLength > 0
    ? (routingKey: string): string => (
      routingKey.startsWith(prefix)
        ? routingKey.substr(prefixLength)
        : routingKey
    )
    : (routingKey: string): string => routingKey

  return async (messageBody: any, raw: Message): Promise<any> => {
    const { properties } = raw
    const { headers = Object.create(null) } = properties
    const routingKey = headers['routing-key'] || raw.routingKey

    // normalize headers access
    if (!properties.headers) {
      properties.headers = headers
    }

    // @todo is it possible to route without prefix trim?
    const route = normalizeActionName(routingKey)

    const opts: ServiceRequest = {
      // initiate action to ensure that we have prepared proto fo the object
      // input params
      // make sure we standardize the request
      // to provide similar interfaces
      params: messageBody,
      route,
      action: noop as any,
      headers: properties,
      locals: Object.create(null),
      log: console as any,
      method: ActionTransport.amqp,
      parentSpan: null,
      query: Object.create(null),
      span: null,
      transport: ActionTransport.amqp,
      transportRequest: raw,
      reformatError: true,
    }

    return wrapDispatch(service.router.dispatch(opts), route, raw)
  }
}

export default getAMQPRouterAdapter
