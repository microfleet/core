function register(server, options, next) {
  server.root.views(options);

  server.root.decorate('request', 'sendView', function sendView(...args) {
    return this
      .render(...args)
      .then(page => this.generateResponse(page));
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
