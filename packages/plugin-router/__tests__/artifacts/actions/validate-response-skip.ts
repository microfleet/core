import { ServiceRequest } from '@microfleet/plugin-router'

export default async function skipResponseValidate(request: ServiceRequest): Promise<any> {
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

skipResponseValidate.validateResponse = false
skipResponseValidate.responseSchema = 'response.validate-response'
skipResponseValidate.schema = 'validate-response'
