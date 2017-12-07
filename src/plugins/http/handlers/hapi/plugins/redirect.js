// @flow

exports.name = 'mservice-redirect';
exports.version = '1.0.0';
exports.once = true;
exports.register = function register(server: Object) {
  server.decorate('request', 'redirect', function redirect(url) {
    return this.response().redirect(url);
  });
};
