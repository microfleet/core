// @flow

/**
 * Project deps
 * @private
 */
const is = require('is');
const uuid = require('uuid/v4');
const assert = require('assert');
const Promise = require('bluebird');
const noop = require('lodash/noop');
const get = require('lodash/get');
const findKey = require('lodash/findKey');
const eos = require('end-of-stream');

const { NotImplementedError } = require('common-errors');
const { FORMAT_HTTP_HEADERS } = require('opentracing');

const _require = require('../utils/require');
const loadProtoDefinitions = require('./gRPC/helpers/loadProtoDefinitions');
const { ActionTransport, PluginsTypes, gRPCTypes } = require('../constants');

const { getCallTypeFromDescriptor } = require('./gRPC/helpers/utils');

const ERROR_NOT_IMPLEMENTED = NotImplementedError('method is not implemented');


/**
 * Plugin Name
 * @type {String}
 */
exports.name = 'gRPC';

/**
 * Plugin Type
 * @type {String}
 */
exports.type = PluginsTypes.transport;


function wrapServiceAction(grpc, service, descriptor, action = ERROR_NOT_IMPLEMENTED) {
  const { router } = service;
  const callType = getCallTypeFromDescriptor(descriptor);
  const execute = (serviceRequest, callback) => (
    Promise
      .bind(router, [action, serviceRequest, callback])
      .spread(router.dispatch)
  );

  return async function handle(call, callback = false) {
    if (action === ERROR_NOT_IMPLEMENTED) {
      if (callback) callback(ERROR_NOT_IMPLEMENTED);
      else throw ERROR_NOT_IMPLEMENTED;
    }

    let headers = Object.create(null);
    if (call.metadata instanceof grpc.Metadata) {
      headers = call.metadata;
    } else {
      call.metadata = headers = new grpc.Metadata();

      /** you're so naive */
      headers.set('client_id', uuid());
    }

    let parentSpan = null;
    if (service._tracer !== undefined) {
      parentSpan = service._tracer.extract(headers, FORMAT_HTTP_HEADERS);
    }

    const serviceRequest: ServiceRequest = {
      headers,
      params: (callType === gRPCTypes.unary || callType === gRPCTypes.responseStream) ? call.request : Object.create(null),
      query: Object.create(null),
      method: callType,
      locals: Object.create(null),

      // transport type
      transport: ActionTransport.gRPC,
      transportRequest: call,

      // defaults for consistent object map
      action: noop,
      route: '',

      // opentracing
      parentSpan,
      span: undefined,

      // set to console
      log: (console: any),
    };

    if (callType === gRPCTypes.requestStream) {
      const results = [];

      call.on('data', (data) => {
        serviceRequest.params = data;
        execute(serviceRequest);
      });

      const pipe = Promise
        .fromCallback(cb => eos(call, cb));

      return pipe
        .return(results)
        .all()
        .asCallback(callback);
    }

    if (callType === gRPCTypes.responseStream) {
      execute(serviceRequest);
      return eos(call, callback);
    }

    if (callType === gRPCTypes.duplex) {
      call.on('data', async (data) => {
        serviceRequest.params = data;
        const res = await execute(serviceRequest, data);
        call.write(res);
      });

      return Promise
        .fromCallback(cb => eos(call, cb))
        .asCallback(callback);
    }

    return execute(serviceRequest, callback);
  };
}

/**
 * Attaches gRPC handler.
 * @param  {Object} config - gRPC handler configuration to attach.
 */
exports.attach = function createServer(config: Object): PluginInterface {
  if (is.fn(this.validateSync)) {
    assert.ifError(this.validateSync('gRPC', config).error);
  }

  assert(this._router, 'router MUST be attached');

  const microfleet = this;
  const grpc = _require('grpc');
  const { createCredentials } = require('./gRPC/helpers/createCredentials');

  const definitions = loadProtoDefinitions(config.proto);
  const protoDescriptor = grpc.loadPackageDefinition(definitions);

  async function connect() {
    const { address, port, ssl } = config.server;
    const host = `${address}:${port}`;
    const credentials = createCredentials(grpc, ssl);
    const instance = microfleet._gRPC = new grpc.Server();

    /*
      1 получить список рутов с gRPC транспортом или получить список методов, которые требуются в реализации?
      2 создать объект с ключем методов из proto-файла и со значением метода-реализации
      3 внутри реализации диспатчить экшен
      4 если действие -- стрим, то два варианта: либо диспатчить экшен на каждое сообщение, либо аггрегировать и вызывать по end
     */
    const actions = microfleet.router.routes[ActionTransport.gRPC];
    const services = is.string(config.implements) ? [config.implements] : config.implements;
    console.log('actions:', actions);

    for (const serviceName of services) {
      const Service = get(protoDescriptor, serviceName);
      const methods = {};

      for (const [name, call] of Object.entries(definitions[serviceName])) {
        const action = findKey(actions, it => (
          it.implements === name || it.actionName.toLowerCase().indexOf(name.toLowerCase()) >= 0
        ));

        console.log('action:', action);
        methods[call.originalName] = wrapServiceAction(grpc, microfleet, call, action);
      }

      instance.addService(Service.service, methods);
    }

    instance.bind(host, credentials);
    return instance.start();
  }

  function close() {
    const { _gRPC } = microfleet;
    return Promise.fromCallback(_gRPC.tryShutdown.bind(_gRPC));
  }

  return {
    connect,
    close,
  };
};
