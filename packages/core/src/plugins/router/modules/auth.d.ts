import { Microfleet, RouterPlugin } from '../../../';
import { ServiceRequest } from '../../../types';
export interface AuthStrategy {
    (this: Microfleet, request: ServiceRequest): PromiseLike<any>;
}
export interface AuthOptions {
    strategies: {
        [strategyName: string]: AuthStrategy;
    };
}
declare function getAuthHandler(config: AuthOptions): (this: Microfleet & RouterPlugin, request: ServiceRequest) => PromiseLike<any>;
export default getAuthHandler;
