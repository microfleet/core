import { ActionTransport } from '@microfleet/core'

export default function successAction(): any {
  return { redirected: true }
}

successAction.schema = false
successAction.transports = [ActionTransport.http]
