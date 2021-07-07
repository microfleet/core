import { Request, Server } from '@hapi/hapi'

export const name = 'mservice-redirect'
export const version = '1.0.0'
export const once = true
export function register(server: Server): void {
  (server as any)._core.root.decorate('request', 'redirect', function redirectResponse(this: Request, url: string) {
    return this.generateResponse(null).redirect(url)
  })
}
