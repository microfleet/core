import { identity } from 'lodash'
import { Microfleet } from '@microfleet/core'
import { MessageConsumer } from '@microfleet/transport-amqp'
import { RouterAMQPPluginConfig } from './types/plugin'
import { AmqpServiceRequest } from './service-request'
import { kReplyHeaders as kRouterReplyHeaders } from '@microfleet/plugin-router'
import { kReplyHeaders as kAmqpReplyHeaders } from '@microfleet/transport-amqp'

import type { Message } from '@microfleet/amqp-coffee'

export function createAmqpRequest(
  messageBody: any,
  raw: Message,
  normalizeActionName: (routingKey: string) => string
) {
  const { properties } = raw
  const { headers = Object.create(null) } = properties
  const routingKey = headers['routing-key'] || raw.routingKey

  // normalize headers access
  if (!properties.headers) {
    properties.headers = headers
  }

  const route = normalizeActionName(routingKey)

  return new (AmqpServiceRequest as any)(
    messageBody,
    route,
    properties,
    raw
  )
}

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
  // @todo is it possible to route without prefix trim?
  const normalizeActionName = prefixLength > 0
    ? (routingKey: string): string => (
      routingKey.startsWith(prefix)
        ? routingKey.slice(prefixLength)
        : routingKey
    )
    : (routingKey: string): string => routingKey

  return async (messageBody: any, raw: Message): Promise<any> => {
    const serviceRequest = createAmqpRequest(messageBody, raw, normalizeActionName)

    return wrapDispatch(
      service.router
        .dispatch(serviceRequest)
        .finally(
          () => {
            let replyHeaders
            const { error } = serviceRequest
            if (error) {
              if (error[kRouterReplyHeaders]) {
                replyHeaders = error[kRouterReplyHeaders]
              } else if (error.inner_error && error.inner_error[kRouterReplyHeaders]) {
                replyHeaders = error.inner_error[kRouterReplyHeaders]
              } else {
                replyHeaders = new Map()
              }
            } else {
              replyHeaders = serviceRequest.getReplyHeaders()
            }
            serviceRequest.transportRequest.extendMessage(kAmqpReplyHeaders, Object.fromEntries(replyHeaders))
          }
        ),
      serviceRequest.route,
      serviceRequest.transportRequest
    )
  }
}

export default getAMQPRouterAdapter
