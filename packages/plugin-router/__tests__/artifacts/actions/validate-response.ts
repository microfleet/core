import { ServiceRequest } from '@microfleet/core'

export default async function responseValidate(request: ServiceRequest): Promise<any> {
  if (request.params.success) {
    return {
      validResponse: true,
    }
  }

  return {
    validResponse: false,
    withAdditionalProperty: true,
  }
}

responseValidate.responseSchema = 'response.validate-response'
responseValidate.schema = 'validate-response'
