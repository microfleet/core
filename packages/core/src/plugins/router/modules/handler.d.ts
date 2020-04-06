import Bluebird = require('bluebird');
import { Microfleet, RouterPlugin } from '../../../';
import { ServiceRequest } from '../../../types';
declare function handler(this: Microfleet & RouterPlugin, request: ServiceRequest): Bluebird<any>;
export default handler;
