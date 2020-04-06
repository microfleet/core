import Bluebird = require('bluebird');
import { Microfleet } from '../../../';
import { ServiceRequest } from '../../../types';
declare function allowedHandler(this: Microfleet, request: ServiceRequest): Bluebird<any>;
export default allowedHandler;
