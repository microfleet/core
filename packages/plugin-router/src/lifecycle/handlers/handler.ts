import { Microfleet } from '@microfleet/core'
import { ServiceRequest } from '../../types/router'

async function handler(this: Microfleet, request: ServiceRequest): Promise<void> {
  const result = await request.action.handler.call(this, request)
  request.response = result
}

export default handler
