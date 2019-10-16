const Promise = require('bluebird');
const request = require('request-promise');
const errors = require('request-promise/errors');

function getHTTPRequest(options) {
  return (action, params, opts = {}) => {
    const requestOptions = {
      baseUrl: options.url,
      method: 'POST',
      simple: true,
      ...options,
      ...opts,
      uri: action,
    };

    // patch
    delete requestOptions.url;

    if (params) {
      requestOptions.json = params;
    } else {
      requestOptions.json = true;
    }

    return request(requestOptions)
      .promise()
      .catch(errors.StatusCodeError, (err) => Promise.reject(err.response.body));
  };
}

module.exports = getHTTPRequest;
