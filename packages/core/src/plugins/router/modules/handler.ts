import Bluebird = require('bluebird');
import { ArgumentError, NotImplementedError } from 'common-errors';
import is = require('is');
import { Microfleet } from '../../../';
import { IServiceRequest } from '../../../types';
import moduleLifecycle from './lifecycle';

function handler(this: Microfleet, request: IServiceRequest) {
  if (request.action === undefined) {
    return Bluebird.reject(new ArgumentError('"request" must have property "action"'));
  }

  if (is.fn(request.action) !== true) {
    return Bluebird.reject(new NotImplementedError('Action must be a function'));
  }

  const { extensions } = this.router;
  return moduleLifecycle('handler', request.action, extensions, [request], this);
}

export default handler;
