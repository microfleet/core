import { ServiceRequest } from '../../../../types';
export declare type ServiceRequestWithSchema = ServiceRequest & {
    schema?: string;
};
declare const _default: {
    point: "postRequest";
    handler(error: Error, request: ServiceRequestWithSchema): Promise<ServiceRequestWithSchema[]>;
}[];
export default _default;
