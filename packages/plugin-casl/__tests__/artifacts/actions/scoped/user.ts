import { ServiceRequest, ServiceAction, ActionTransport } from '@microfleet/plugin-router'

const actionWithRbac: Partial<ServiceAction> = async function actionWithRbac(request: ServiceRequest): Promise<any> {
  return {
    response: 'success',
    scope: 'app:user',
    token: request.params.token,
    user: request.auth,
  }
}

actionWithRbac.transports = [
  ActionTransport.internal
]
actionWithRbac.auth = 'token'
actionWithRbac.rbacScope = {
  action: 'read',
  subject: 'app:user'
}

export default actionWithRbac
