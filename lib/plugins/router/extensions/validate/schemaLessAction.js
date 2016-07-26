'use strict';

const Promise = require('bluebird');

module.exports = [{
  point: 'postRequest',
  handler: (error, request) => {
    const action = request.action;

    if (action.schema === undefined) {
      action.schema = action.name;
    }

    return Promise.resolve([error, request]);
  }
}];