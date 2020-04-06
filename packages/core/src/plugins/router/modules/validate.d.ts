import Bluebird = require('bluebird');
import { Microfleet } from '../../../';
import { ServiceRequest } from '../../../types';
import { ValidatorPlugin } from '../../validator';
declare function validateHandler(this: Microfleet & ValidatorPlugin, request: ServiceRequest): Bluebird<any>;
export default validateHandler;
