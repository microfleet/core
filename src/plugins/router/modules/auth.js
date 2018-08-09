// @flow
const { AuthenticationRequired, NotImplementedError, ArgumentError } = require('common-errors');
const is = require('is');
const Promise = require('bluebird');
const moduleLifecycle = require('./lifecycle');

const remapError = (error) => {
  if (error.constructor === AuthenticationRequired) {
    return Promise.reject(error);
  }

  return Promise.reject(new AuthenticationRequired(error.message, error));
};

const assignTo = (container, prop) => (value) => {
  container[prop] = value ? { credentials: value } : value;
};

const setToNull = () => null;
const reject = e => Promise.reject(e);
const isObligatory = (strategy) => {
  switch (strategy) {
    case 'try':
      return setToNull;

    default:
      return reject;
  }
};

const retrieveStrategy = (request, strategies) => {
  // eslint-disable-next-line prefer-destructuring
  const action: ServiceAction = request.action;
  const authConfig = action.auth;

  // prepare vars
  let getAuthName;
  let passAuthError;
  let authStrategy;

  // new way of complex auth object
  if (is.object(authConfig)) {
    getAuthName = authConfig.name;
    authStrategy = authConfig.strategy || 'required';
    passAuthError = authConfig.passError || false;
  } else {
    getAuthName = authConfig;
    authStrategy = 'required';
    passAuthError = action.passAuthError || false;
  }

  // find name
  const name = is.fn(getAuthName) ? getAuthName(request) : getAuthName;
  const strategy = strategies[name];

  // no strat - fail
  if (strategy == null) {
    return {
      name,
      strategy: null,
      passAuthError,
      authStrategy,
    };
  }

  return {
    name,
    strategy,
    passAuthError,
    authStrategy,
  };
};

function auth(request: ServiceRequest, strategies: Object): Promise<any> {
  const authSchema = retrieveStrategy(request, strategies);

  if (authSchema.strategy == null) {
    return Promise.reject(new NotImplementedError(authSchema.name));
  }

  // $FlowFixMe
  const promise = Promise
    .bind(this, request)
    .then(authSchema.strategy)
    .catch(isObligatory(authSchema.authStrategy))
    .tap(assignTo(request, 'auth'))
    .return(request);

  if (authSchema.passAuthError === true) {
    return promise;
  }

  return promise.catch(remapError);
}

function assignStrategies(strategies): Function {
  return function authHandler(request: ServiceRequest): Promise<any> {
    const { action } = request;

    if (action === undefined) {
      return Promise.reject(new ArgumentError('"request" must have property "action"'));
    }

    if (is.undefined(action.auth) === true) {
      return Promise.resolve(request);
    }

    return moduleLifecycle('auth', auth, this.router.extensions, [request, strategies], this);
  };
}

function getAuthHandler(config: Object): Function {
  const strategies = Object.assign(Object.create(null), config.strategies);
  return assignStrategies(strategies);
}

module.exports = getAuthHandler;
