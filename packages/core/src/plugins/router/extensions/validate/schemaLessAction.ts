import { IServiceRequest } from '../../../../types';

export type ServiceRequestWithSchema = IServiceRequest & {
  schema?: string;
};

export default [{
  point: 'postRequest',
  async handler(error: Error, request: ServiceRequestWithSchema) {
    if (error) {
      throw error;
    }

    const { action } = request;

    if (action.schema === undefined) {
      action.schema = action.actionName;
    }

    return [error, request];
  },
}];
