import { ServiceRequest } from '@microfleet/core'

export default async function withoutSchema(request: ServiceRequest): Promise<any> {
  return request.params
}
