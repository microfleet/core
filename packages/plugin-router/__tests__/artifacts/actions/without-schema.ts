import { ServiceRequest } from '@microfleet/plugin-router'

export default async function withoutSchema(request: ServiceRequest): Promise<any> {
  return request.params
}
