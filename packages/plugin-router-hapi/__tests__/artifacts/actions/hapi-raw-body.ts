import { ActionTransport, ServiceRequest, ServiceAction } from '@microfleet/plugin-router'

const rawBodyAction: Partial<ServiceAction> = function rawBodyAction({ transportRequest }: ServiceRequest): any {
  if (Buffer.isBuffer(transportRequest.payload)) {
    return transportRequest.payload
  }

  return new Error('It is not buffer!!!')
}

rawBodyAction.schema = false
rawBodyAction.transports = [ActionTransport.http]
rawBodyAction.transportOptions = {
  hapi: {
    options: {
      payload: {
        output: 'data',
        parse: false,
      },
    },
    method: ['POST'],
  },
}
