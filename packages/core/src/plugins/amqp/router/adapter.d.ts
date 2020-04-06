import { Router } from '../../router/factory';
declare function getAMQPRouterAdapter(router: Router, config: any): (params: any, properties: any, raw: any, next?: (...args: any[]) => void) => Promise<any>;
export default getAMQPRouterAdapter;
