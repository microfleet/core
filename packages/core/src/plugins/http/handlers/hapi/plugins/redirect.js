// @flow

exports.name = 'mservice-redirect';
exports.version = '1.0.0';
exports.once = true;
exports.register = function register(server: Object) {
  server._core.root.decorate('request', 'redirect', function redirectResponse(url) {
    return this.generateResponse().redirect(url);
  });
};
