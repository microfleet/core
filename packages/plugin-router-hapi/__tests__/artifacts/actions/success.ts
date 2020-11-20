import { ActionTransport } from '@microfleet/plugin-router'

export default function successAction(): any {
  return { redirected: true }
}

successAction.schema = false
successAction.transports = [ActionTransport.http]
