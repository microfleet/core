// @flow
import type { ServiceRequest } from '../../../../types';

const parse = require('qs/lib/parse');
const identity = require('lodash/identity');

function preValidate(request: ServiceRequest) {
  const { query } = request;

  // if present - remap, otherwise just noop
  if (query) {
    const { action } = request;
    const { transformQuery = identity, transformOpts } = action;

    // eslint-disable-next-line no-param-reassign
    request.query = transformQuery(parse(query, {
      parameterLimit: 10,
      parseArrays: false,
      depth: 1,
      ...transformOpts,
    }));
  }

  return request;
}

module.exports = [{
  point: 'preValidate',
  handler: preValidate,
}];
