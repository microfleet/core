import { ActionTransport } from '@microfleet/plugin-router'

export default async function handler(): Promise<any> {
  return { success: true }
}

handler.schema = false
handler.transports = [ActionTransport.amqp]
