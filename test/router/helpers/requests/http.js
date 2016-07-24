const Promise = require('bluebird');
const request = require('request');

function getHTTPRequest(options) {
  function HTTPRequest(action, params) {
    const requestOptions = {
      uri: `${options.url}${action}`,
      method: 'POST',
      json: params,
    };

    return new Promise((resolve, reject) => {
      const callback = (error, response, body) => {
        if (!error && response.statusCode === 200) {
          resolve(body);
        } else {
          reject(body);
        }
      };

      request(requestOptions, callback);
    });
  }

  return HTTPRequest;
}

module.exports = getHTTPRequest;
