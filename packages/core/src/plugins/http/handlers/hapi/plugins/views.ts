import { Request, Server } from '@hapi/hapi'

export const name = 'view-wrapper'
export const dependencies = '@hapi/vision'
export const version = '1.0.0'
export const once = true
export function register(server: Server, options: any) {
  (server as any)._core.root.views(options);
  (server as any)._core.root.decorate('request', 'sendView', async function sendView(this: Request, ...args: any[]) {
    const page = await (this as any).render(...args)
    return this.generateResponse(page)
  })
}
