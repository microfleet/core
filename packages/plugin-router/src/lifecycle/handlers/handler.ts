import { Microfleet, ServiceRequest } from '@microfleet/core'

import { RouterPlugin } from '../../types/plugin'

async function handler(this: Microfleet & RouterPlugin, request: ServiceRequest): Promise<void> {
  const result = await request.action(request)

  // eslint-disable-next-line no-console
  console.log(1, result)

  request.response = result
}

export default handler
