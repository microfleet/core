import type { ServiceRequest } from '@microfleet/plugin-router'
import { ActionTransport, kReplyHeaders } from '@microfleet/plugin-router'

const unsuccessfulAttemptError = new Error('The Unexpected Error... has been thrown... and crashed... everything!!!')
unsuccessfulAttemptError[kReplyHeaders] = new Map([['x-unsuccessful-attempts', '1/10']])

export default async function errorHeadersAction(request: ServiceRequest): Promise<any> {
  request.setReplyHeader('x-happy-path', 'Things were ob-la-di ob-la-da until...')

  throw unsuccessfulAttemptError
}
errorHeadersAction.schema = false
errorHeadersAction.transports = [ActionTransport.http]
