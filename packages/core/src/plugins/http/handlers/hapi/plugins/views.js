// @flow

exports.name = 'view-wrapper';
exports.dependencies = 'vision';
exports.version = '1.0.0';
exports.once = true;
exports.register = function register(server: Object, options: Object) {
  server._core.root.views(options);
  server._core.root.decorate('request', 'sendView', async function sendView(...args) {
    const page = await this.render(...args);
    return this.generateResponse(page);
  });
};
