// @flow
function register(server: Object, options: Object, next: (error: ?Error) => void) {
  server.root.decorate('request', 'setState', function setState(name, value, stateOptions) {
    return this._setState(name, value, stateOptions);
  });

  return next();
}

register.attributes = {
  name: 'mservice-state',
  version: '1.0.0',
  once: true,
};

exports.register = register;
