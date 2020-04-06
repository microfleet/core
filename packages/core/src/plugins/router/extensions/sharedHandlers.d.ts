import { ServiceRequest } from '../../../types';
interface RequestStartExtension {
    started: [number, number];
    executionTotal: [number, number];
}
export declare type ServiceRequestWithStart = ServiceRequest & RequestStartExtension;
export declare function storeRequestTimeFactory(): {
    point: "preRequest";
    handler(route: string, request: ServiceRequestWithStart): Promise<(string | ServiceRequestWithStart)[]>;
};
export {};
