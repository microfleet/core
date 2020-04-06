import Bluebird = require('bluebird');
import { Microfleet } from '../../../';
import { ServiceRequest } from '../../../types';
declare function responseHandler(this: Microfleet, params: [Error | null, any, ServiceRequest]): Bluebird<any>;
export default responseHandler;
