"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Bluebird = require("bluebird");
const common_errors_1 = require("common-errors");
const is = require("is");
const constants_1 = require("../../../constants");
const lifecycle_1 = require("./lifecycle");
const remapError = (error) => {
    if (error.constructor === common_errors_1.AuthenticationRequiredError) {
        return Bluebird.reject(error);
    }
    return Bluebird.reject(new common_errors_1.AuthenticationRequiredError(error.message, error));
};
const assignTo = (container, prop) => (value) => {
    container[prop] = value ? { credentials: value } : value;
};
const reject = (e) => Bluebird.reject(e);
const setToNull = () => null;
const isObligatory = (strategy) => {
    switch (strategy) {
        case 'try':
            return setToNull;
        default:
            return reject;
    }
};
const retrieveStrategy = (request, strategies) => {
    const { action } = request;
    const authConfig = action.auth;
    // prepare vars
    let getAuthName;
    let passAuthError;
    let authStrategy;
    // new way of complex auth object
    if (is.object(authConfig)) {
        getAuthName = authConfig.name;
        authStrategy = authConfig.strategy || 'required';
        passAuthError = authConfig.passAuthError || false;
    }
    else {
        getAuthName = authConfig;
        authStrategy = 'required';
        passAuthError = action.passAuthError || false;
    }
    // find name
    const name = typeof getAuthName === 'function'
        ? getAuthName(request)
        : getAuthName;
    const strategy = strategies[name];
    // no strat - fail
    if (strategy == null) {
        return {
            authStrategy,
            name,
            passAuthError,
            strategy: null,
        };
    }
    return {
        authStrategy,
        name,
        passAuthError,
        strategy,
    };
};
function auth(request, strategies) {
    const authSchema = retrieveStrategy(request, strategies);
    if (authSchema.strategy == null) {
        return Bluebird.reject(new common_errors_1.NotImplementedError(authSchema.name));
    }
    const promise = Bluebird
        .resolve(request)
        .bind(this)
        .then(authSchema.strategy)
        .catch(isObligatory(authSchema.authStrategy))
        .tap(assignTo(request, 'auth'))
        .return(request);
    if (authSchema.passAuthError) {
        return promise;
    }
    return promise.catch(remapError);
}
function assignStrategies(strategies) {
    return function authHandler(request) {
        const authFn = is.undefined(request.action.auth)
            ? constants_1.identity
            : auth;
        return lifecycle_1.default('auth', authFn, this.router.extensions, [request, strategies], this);
    };
}
function getAuthHandler(config) {
    const strategies = Object.assign(Object.create(null), config.strategies);
    return assignStrategies(strategies);
}
exports.default = getAuthHandler;
//# sourceMappingURL=auth.js.map