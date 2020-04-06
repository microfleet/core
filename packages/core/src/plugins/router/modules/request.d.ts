import Bluebird = require('bluebird');
import { Microfleet, RouterPlugin } from '../../../';
import { ServiceRequest } from '../../../types';
declare function requestHandler(this: Microfleet & RouterPlugin, route: string, request: ServiceRequest): Bluebird<any>;
export default requestHandler;
