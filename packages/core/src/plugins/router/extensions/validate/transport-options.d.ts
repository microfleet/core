import Bluebird = require('bluebird');
import { ServiceRequest } from '../../../../types';
export declare type TransportOptionsAugmentedRequest = ServiceRequest & {
    action: ServiceRequest['action'] & {
        transportsOptions: {
            [transport: string]: {
                methods: string[];
            };
        };
    };
};
declare function postRequest(error: Error, request: TransportOptionsAugmentedRequest): Bluebird<(Error | TransportOptionsAugmentedRequest)[]>;
declare const _default: {
    handler: typeof postRequest;
    point: "postRequest";
}[];
export default _default;
