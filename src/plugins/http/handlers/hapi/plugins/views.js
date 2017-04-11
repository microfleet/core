function register(server, options, next) {
  server.root.views(options);

  server.root.decorate('request', 'sendView', function sendView(...args) {
    return this
      .render(...args)
      .then(page => this.generateResponse(page));
  });

  server.root.decorate('request', 'redirect', function redirect(url) {
    return this.generateResponse().redirect(url);
  });

  return next();
}

register.attributes = {
  name: 'view-wrapper',
  dependencies: ['vision'],
  version: '1.0.0',
  once: true,
};

exports.register = register;
