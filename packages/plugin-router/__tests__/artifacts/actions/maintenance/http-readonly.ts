import { ActionTransport } from '@microfleet/core'

export default async function handler(): Promise<any> {
  return { success: true }
}

handler.schema = false
handler.transports = [ActionTransport.http]
handler.readonly = true
