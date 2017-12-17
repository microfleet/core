// @flow
import type { ServiceRequest } from '../../../../types';

const Promise = require('bluebird');

module.exports = [
  {
    point: 'postRequest',
    handler: (error: Error, request: ServiceRequest) => {
      if (error) {
        return Promise.reject(error);
      }

      const { action } = request;

      if (action.schema === undefined) {
        action.schema = action.actionName;
      }

      return Promise.resolve([error, request]);
    },
  },
];
