import { NotPermittedError } from 'common-errors'
// @ts-expect-error no types
import { ServiceRequest } from '@microfleet/plugin-router'

export async function handler(request: ServiceRequest): Promise<any> {
  return {
    response: 'success',
    token: request.params.token,
    user: request.auth?.credentials as unknown,
  }
}

export const auth = 'token'
export const allowed = async (request: ServiceRequest): Promise<any> => {
  if (request.params.isAdmin !== true) {
    throw new NotPermittedError('You are not admin')
  }
}
