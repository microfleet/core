import { Request, Server } from '@hapi/hapi'

export const name = 'mservice-state'
export const version = '1.0.0'
export const once = true
export function register(server: Server) {
  (server as any)._core.root.decorate(
    'request', 'setState',
    function setState(this: Request, cookieName: string, value: any, stateOptions: any) {
      return (this as any)._setState(cookieName, value, stateOptions)
    }
  )
}
