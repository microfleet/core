const Errors = require('common-errors');
const Promise = require('bluebird');

module.exports = {
  auth: 'token',
  allowed: request => {
    if (request.params.isAdmin === true) {
      return Promise.resolve();
    }

    return Promise.reject(new Errors.NotPermittedError('You are not admin'));
  },
  handler: request => Promise.resolve({
    response: 'success',
    token: request.params.token,
    user: request.auth.credentials,
  }),
  schema: 'action.simple',
  transports: ['amqp', 'http', 'socketIO'],
};
