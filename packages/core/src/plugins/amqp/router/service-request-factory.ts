import { ActionTransport, ServiceRequestInterface } from '../../..';
import { ServiceRequest } from '../../../utils/service-request';

export const createServiceRequest = (
  properties: any,
  params: any,
  parentSpan: any
): ServiceRequestInterface => (
  new ServiceRequest(
    ActionTransport.amqp,
    'amqp',
    Object.create(null),
    properties,
    params,
    Object.create(null),
    undefined,
    parentSpan,
  )
);
