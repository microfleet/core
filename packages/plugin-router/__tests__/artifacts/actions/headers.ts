import { ok } from 'assert'
import type { ServiceRequest } from '@microfleet/plugin-router'

export default async function headersAction(request: ServiceRequest): Promise<any> {
  request.setReplyHeader('x-add', 'added')

  request.setReplyHeader('x-add-remove', 'added removed')
  ok(request.hasReplyHeader('x-add-remove'))
  request.removeReplyHeader('x-add-remove')

  request.setReplyHeader('x-override', 'old')
  request.setReplyHeader('X-OVERRIDE', 'new')

  request.setReplyHeader('set-cookie', 'foo=1')
  request.setReplyHeader('set-cookie', 'bar=2')

  request.setReplyHeader('x-non-ascii', '👾')
  request.setReplyHeader('x-empty', '')

  return {
    response: 'success',
  }
}
