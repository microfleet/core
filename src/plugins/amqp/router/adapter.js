// @flow
import type { ServiceRequest } from '../../../types';
import type { Router } from '../../router/factory';

const Promise = require('bluebird');
const is = require('is');
const noop = require('lodash/noop');
const passThrough = require('lodash/identity');
const { ActionTransport } = require('../../../constants');

// cached var
const { amqp } = ActionTransport;

function getAMQPRouterAdapter(router: Router, config: Object) {
  const onComplete = config.transport.onComplete;
  const onCompleteBound = is.fn(onComplete) && onComplete.bind(router.service);
  const wrapDispatch = onCompleteBound
    ? (promise, actionName, actions) => promise.reflect()
      .then((fate) => {
        const err = fate.isRejected() ? fate.reason() : null;
        const data = fate.isFulfilled() ? fate.value() : null;
        return [err, data, actionName, actions];
      })
      .spread(onCompleteBound)
    : passThrough;

  // pre-wrap the function so that we do not need to actually do fromNode(next)
  const dispatch = Promise.promisify(router.dispatch, { context: router });

  return function AMQPRouterAdapter(params: mixed, headers: Object, actions: Object, next?: () => mixed) {
    const actionName = headers.routingKey;
    const opts: ServiceRequest = {
      params,
      headers,
      query: {},
      // to provide similar interfaces
      transport: amqp,
      method: amqp,
      transportRequest: {},
      // initiate action to ensure that we have prepared proto fo the object
      action: noop,
      route: '',
    };

    const promise = dispatch(actionName, opts);
    const wrappedDispatch = wrapDispatch(promise, actionName, actions);

    // promise or callback
    return is.fn(next) ? wrappedDispatch.asCallback(next) : wrappedDispatch;
  };
}

module.exports = getAMQPRouterAdapter;
