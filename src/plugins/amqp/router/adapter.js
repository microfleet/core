// @flow
import type { Router } from '../../router/factory';

const Promise = require('bluebird');
const is = require('is');
const noop = require('lodash/noop');
const get = require('lodash/get');
const passThrough = require('lodash/identity');
const { ActionTransport } = require('../../../constants');

// cached var
const { amqp } = ActionTransport;

function getAMQPRouterAdapter(router: Router, config: Object) {
  const { onComplete } = config.transport;
  const { service } = router;
  const wrapDispatch = is.fn(onComplete)
    ? (promise, actionName, raw) => promise
      .reflect()
      .then((fate) => {
        const err = fate.isRejected() ? fate.reason() : null;
        const data = fate.isFulfilled() ? fate.value() : null;
        return onComplete.call(service, err, data, actionName, raw);
      })
    : passThrough;

  // pre-wrap the function so that we do not need to actually do fromNode(next)
  const dispatch = Promise.promisify(router.dispatch, { context: router });
  const prefix = get(config, 'router.prefix') ? `${config.router.prefix}.` : '';
  const prefixLength = prefix && prefix.length;
  const normalizeActionName = prefix
    ? routingKey => (
      routingKey.startsWith(prefix) === true
        ? routingKey.substr(prefixLength)
        : routingKey
    )
    : passThrough;

  return function AMQPRouterAdapter(params: mixed, properties: Object, raw: Object, next?: () => mixed) {
    const routingKey = properties.headers['routing-key'] || properties.routingKey;
    const actionName = normalizeActionName(routingKey);
    const opts: ServiceRequest = {
      // input params
      params,
      headers: properties,
      // to provide similar interfaces
      transport: amqp,
      method: amqp,
      // initiate action to ensure that we have prepared proto fo the object
      action: noop,
      route: '',
      // make sure we standardize the request
      query: Object.create(null),
      transportRequest: Object.create(null),
      // pass raw span
      parentSpan: raw.span,
      span: undefined,

      // set to console
      log: (console: any),
    };

    const promise = dispatch(actionName, opts);
    const wrappedDispatch = wrapDispatch(promise, actionName, raw);

    // promise or callback
    return wrappedDispatch.asCallback(next);
  };
}

module.exports = getAMQPRouterAdapter;
