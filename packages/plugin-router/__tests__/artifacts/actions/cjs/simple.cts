import { NotPermittedError } from 'common-errors'
import { ServiceRequest } from '@microfleet/plugin-router'

export default async function simpleAction(request: ServiceRequest): Promise<any> {
  return {
    response: 'success',
    token: request.params.token,
    user: request.auth?.credentials as unknown,
  }
}

simpleAction.auth = 'token'
simpleAction.allowed = async (request: ServiceRequest): Promise<any> => {
  if (request.params.isAdmin !== true) {
    throw new NotPermittedError('You are not admin')
  }
}
