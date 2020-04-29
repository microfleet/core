import { Request } from '@hapi/hapi'
import SpanContext from 'opentracing/src/span_context';
import { ActionTransport, RequestMethods, ServiceRequestInterface } from '../../../../..';
import { ServiceRequest } from '../../../../../utils/service-request';

export const createServiceRequest = (
  request: Request,
  parentSpan?: SpanContext
): ServiceRequestInterface => (
  new ServiceRequest(
    ActionTransport.http,
    request.method.toLowerCase() as RequestMethods,
    request.query,
    request.headers,
    request.payload,
    request,
    undefined,
    parentSpan,
  )
)
