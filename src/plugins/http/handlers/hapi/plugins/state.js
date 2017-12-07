// @flow

exports.name = 'mservice-state';
exports.version = '1.0.0';
exports.once = true;
exports.register = function register(server: Object) {
  server.decorate('request', 'setState', function setState(name, value, stateOptions) {
    return this._setState(name, value, stateOptions);
  });
};
