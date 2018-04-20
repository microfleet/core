const assert = require('assert');
const avvio = require('avvio');
const mconfig = require('@microfleet/config');
const mvalidation = require('@microfleet/validation');
const mlog = require('@microfleet/log');
const mrouter = require('@microfleet/router');
const decorator = require('./decorate');
const { State } = require('./constants');

function buildService(options = {}) {
  assert(typeof options === 'object', 'Options must be an object');

  const microfleet = {
    [State.started]: false,
  };

  const app = avvio(microfleet, {
    autostart: false,
  });

  app.on('start', () => {
    microfleet[State.started] = true;
  });

  // extend server methods
  microfleet.register = microfleet.use;
  microfleet.decorate = decorator.add;
  microfleet.hasDecorator = decorator.exist;

  // register essential plugins
  // Ensure we register our own default plugins, which
  // are considered essential for everything else
  // 1. config - provides methods to 'extend' base configuration
  // 2. validation
  // 3. log
  // 4. router
  microfleet.register(mconfig, options);
  microfleet.register(mvalidation);
  microfleet.register(mlog);
  microfleet.register(mrouter);

  return microfleet;
}

module.exports = buildService;
