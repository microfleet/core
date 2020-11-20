import { Microfleet } from '@microfleet/core'

import { RouterPlugin } from '../../types/plugin'
import { ServiceRequest } from '../../types/router'

async function handler(this: Microfleet & RouterPlugin, request: ServiceRequest): Promise<void> {
  const result = await request.action.call(this, request)

  request.response = result
}

export default handler
