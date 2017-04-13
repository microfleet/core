function register(server, options, next) {
  server.root.decorate('request', 'redirect', function redirect(url) {
    return this.generateResponse().redirect(url);
  });

  return next();
}

register.attributes = {
  name: 'mservice-redirect',
  version: '1.0.0',
  once: true,
};

exports.register = register;
