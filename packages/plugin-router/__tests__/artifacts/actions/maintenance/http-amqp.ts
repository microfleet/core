import { Microfleet } from '@microfleet/core'
import { ActionTransport } from '@microfleet/plugin-router'

export default async function handler(this: Microfleet): Promise<any> {
  await this.amqp.publishAndWait('maintenance.amqp', {
    some: 'data',
  })

  return { success: true }
}

handler.schema = false
handler.transports = [ActionTransport.http]
handler.readonly = true
