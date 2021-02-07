import { ActionTransport, ServiceRequest } from '@microfleet/plugin-router'

export default function rawBodyAction({ transportRequest }: ServiceRequest): any {
  if (Buffer.isBuffer(transportRequest.payload)) {
    return transportRequest.payload
  }

  return new Error('It is not buffer!!!')
}

rawBodyAction.schema = false
rawBodyAction.transports = [ActionTransport.http]
rawBodyAction.transportOptions = {
  handlers: {
    hapi: {
      config: {
        payload: {
          output: 'data',
          parse: false,
        },
      },
      method: ['POST'],
    },
  },
}
