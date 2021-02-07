import { HttpStatusError } from 'common-errors'
import { ActionTransport } from '@microfleet/plugin-router'

export default function handler(): Promise<any> {
  throw new HttpStatusError(202, 'ok')
}

handler.transports = [ActionTransport.amqp]
