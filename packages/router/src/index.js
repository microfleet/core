const assert = require('assert');
const path = require('path');

async function buildRouter(microfleet, opts = {}) {
  const kInternal = Symbol('internal');
  const namespace = opts.namespace || 'router';
  const router = {};

  // verify dependencies
  assert(microfleet.hasDecorator('config'), 'Must enable config module');
  assert(microfleet.hasDecorator('validation'), 'Must enable validation module');
  assert(microfleet.hasDecorator('log'), 'Must enable log module');

  const env = microfleet.config.get('config.env');
  const production = env === 'production';

  // router configuration schema
  microfleet.config.extend(namespace, {
    auth: {
      doc: 'Authentication schemas',
      strategies: {
        doc: 'Description of auth schemas',
        default: {},
      },
    },
    extensions: {
      doc: 'Global router extensions',
      default: [],
    },
    routes: {
      doc: 'Routes configuration',
      directory: {
        doc: 'Directory to scan for actions',
        default: path.resolve(process.cwd(), production ? 'lib/actions' : 'src/actions'),
      },
      prefix: {
        doc: 'Default prefix for each route',
        type: String,
        default: '',
      },
    },
  });

  // public API
  router.registerTransport = registerTransport;
  router.addAction = addAction;
  router.dispatch = dispatch;
  router.internalTransport = kInternal;

  // extend server with router obj
  microfleet.decorate(namespace, router);

  /**
   * Registers new transport.
   * @param {Symbol|string} kTransport - Transport type.
   */
  function registerTransport(kTransport) {
    // TODO: ...
  }

  /**
   * Registers new action in the router.
   * @param {Action} action - Action configuration object.
   */
  function addAction(action) {
    // TODO: ...
  }

  /**
   * Dispatches service request on a supplied transport.
   * @param  {string} route - Routing string to use.
   * @param  {ServiceRequest} serviceRequest - Generic Service Request.
   * @param  {Symbol|string} [transport=kInternal] - Transport to dispatch request for.
   */
  async function dispatch(route, serviceRequest, transport = kInternal) {
    // TODO: ...
  }
}

module.exports = buildRouter;
