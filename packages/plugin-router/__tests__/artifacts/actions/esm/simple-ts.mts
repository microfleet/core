import { NotPermittedError } from 'common-errors'
import { ServiceRequest } from '@microfleet/plugin-router'

export async function handler(request: ServiceRequest) {
  return {
    response: 'success',
    token: request.params.token,
    user: request.auth?.credentials,
  }
}

export const auth = 'token'
export const allowed = async (request: ServiceRequest) => {
  if (request.params.isAdmin !== true) {
    throw new NotPermittedError('You are not admin')
  }
}
