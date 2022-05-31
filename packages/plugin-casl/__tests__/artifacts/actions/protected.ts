import { ServiceRequest, ServiceAction, ActionTransport } from '@microfleet/plugin-router'

const actionWithRbac: Partial<ServiceAction> = async function actionWithRbac(request: ServiceRequest): Promise<any> {
  return {
    response: 'success',
    token: request.params.token,
    user: request.auth,
  }
}

actionWithRbac.transports = [
  ActionTransport.internal
]
actionWithRbac.auth = 'token'
actionWithRbac.rbac = {
  action: 'read',
  subject: 'my-subject'
}

export default actionWithRbac
