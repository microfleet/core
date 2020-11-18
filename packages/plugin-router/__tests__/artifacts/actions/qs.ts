import { ActionTransport, ServiceRequest } from '@microfleet/core'

export default async function QSAction(request: ServiceRequest): Promise<any> {
  return {
    response: 'success',
    qs: request.query,
  }
}

QSAction.transformQuery = (query: any): any => {
  // toFloat
  query.sample *= 1

  // true/1 as true, rest as false
  switch (query.bool) {
    case 'true':
    case '1':
      query.bool = true
      break

    case 'false':
    case '0':
    case undefined:
      query.bool = false
      break

    // fail validation
    default:
      query.bool = null
  }

  return query
}
QSAction.transports = [ActionTransport.http]
QSAction.transportsOptions = {
  [ActionTransport.http]: {
    methods: ['get'],
  },
}
