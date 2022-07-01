import { ServiceRequest, ServiceAction, ActionTransport } from '@microfleet/plugin-router'

const action: Partial<ServiceAction> = async function action(request: ServiceRequest): Promise<any> {
  return {
    response: 'success',
    params: request.params,
    credentials: await request.signedRequest?.getCredentials()
  }
}

action.transports = [
  ActionTransport.internal, ActionTransport.http
]

action.auth = 'token-or-signed'

export default action
