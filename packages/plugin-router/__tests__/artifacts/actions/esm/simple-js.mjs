import { NotPermittedError } from 'common-errors'

export async function handler(request) {
  return {
    response: 'success',
    token: request.params.token,
    user: request.auth?.credentials,
  }
}

export const auth = 'token'
export const allowed = async (request) => {
  if (request.params.isAdmin !== true) {
    throw new NotPermittedError('You are not admin')
  }
}
