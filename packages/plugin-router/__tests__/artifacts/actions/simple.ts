import { NotPermittedError } from 'common-errors'
import { ServiceRequest } from '@microfleet/core'

export default async function simpleAction(request: ServiceRequest): Promise<any> {
  return {
    response: 'success',
    token: request.params.token,
    user: request.auth.credentials,
  }
}

simpleAction.auth = 'token'
simpleAction.allowed = async (request: ServiceRequest): Promise<any> => {
  if (request.params.isAdmin !== true) {
    throw new NotPermittedError('You are not admin')
  }
}
