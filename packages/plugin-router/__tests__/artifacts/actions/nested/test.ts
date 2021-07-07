import { ServiceRequest } from '@microfleet/plugin-router'

export default async (request: ServiceRequest): Promise<any> => request.params
