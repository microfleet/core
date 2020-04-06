import Bluebird = require('bluebird');
import { ServiceRequest } from '../../types';
import { Router } from './factory';
export declare type RequestCallback = (err: any, result?: any) => void;
declare function dispatch(this: Router, route: string, request: ServiceRequest): Bluebird<any>;
declare function dispatch(this: Router, route: string, request: ServiceRequest, callback: RequestCallback): void;
export default dispatch;
