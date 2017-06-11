const { ActionTransport } = require('./../../../../src');
const Errors = require('common-errors');
const Promise = require('bluebird');

function SimpleAction(request) {
  return Promise.resolve({
    response: 'success',
    token: request.params.token,
    user: request.auth.credentials,
  });
}

SimpleAction.auth = 'token';

SimpleAction.allowed = (request) => {
  if (request.params.isAdmin === true) {
    return Promise.resolve(request);
  }

  return Promise.reject(new Errors.NotPermittedError('You are not admin'));
};

SimpleAction.schema = 'action.simple';

SimpleAction.transports = [
  ActionTransport.amqp,
  ActionTransport.http,
  ActionTransport.socketIO,
];


module.exports = SimpleAction;
