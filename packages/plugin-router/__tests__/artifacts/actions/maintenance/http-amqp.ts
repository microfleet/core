import { ActionTransport, Microfleet } from '@microfleet/core'
import { AMQPPlugin } from '@microfleet/plugin-amqp'

export default async function handler(this: Microfleet & AMQPPlugin): Promise<any> {
  await this.amqp.publishAndWait('maintenance.amqp', {
    some: 'data',
  })

  return { success: true }
}

handler.schema = false
handler.transports = [ActionTransport.http]
handler.readonly = true
