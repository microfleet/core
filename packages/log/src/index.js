const assert = require('assert');
const v4 = require('uuid/v4');
const abstractLogging = require('abstract-logging');
const stdout = require('stdout-stream');
const pino = require('pino');

/**
 * Logger Validation - log4j compatible-logger format.
 * Code partly imported from 'fastify'.
 * Repo - https://github.com/fastify/fastify.
 * License - MIT (https://raw.githubusercontent.com/fastify/fastify/master/LICENSE).
 * @param {*} logger - Instance to validate.
 */
function isValidLogger(logger) {
  if (!logger) {
    return false;
  }

  let result = true;
  const methods = ['info', 'error', 'debug', 'fatal', 'warn', 'trace', 'child'];
  for (let i = 0; i < methods.length; i += 1) {
    if (!logger[methods[i]] || typeof logger[methods[i]] !== 'function') {
      result = false;
      break;
    }
  }
  return result;
}

/**
 * Wraps existing logger.
 * Code partly imported from `pino-http`.
 * Repo - https://github.com/pinojs/pino-http.
 * License - MIT (https://raw.githubusercontent.com/pinojs/pino-http/master/LICENSE).
 * @param  {Object} opts - Logging options.
 * @param  {WriteStream} [_stream] - Any write stream.
 * @returns {Logger} - Log4J compatible Logger.
 */
function createLogger(opts, _stream) {
  const stream = _stream || opts.stream;
  delete opts.stream;

  const prevLogger = opts.logger;
  const prevGenReqId = opts.genReqId;
  let logger = null;

  if (prevLogger) {
    opts.logger = undefined;
    opts.genReqId = undefined;
    logger = prevLogger.child(opts);
    opts.logger = prevLogger;
    opts.genReqId = prevGenReqId;
  } else {
    logger = pino(opts, stream);
  }

  return logger;
}

async function buildLogger(microfleet, opts = {}) {
  const kLoggerInstance = Symbol('logger');
  const namespace = opts.namespace || 'log';
  const log = {};

  // verify dependencies
  assert(microfleet.hasDecorator('config'), 'Must enable config module');

  // provides configuration for the module
  microfleet.config.extend(namespace, {
    logger: {
      doc: 'Logger module or options',
      default: {},
    },
    genReqId: {
      doc: 'Request Id Generator',
      default: function genReqId(req) {
        return req.headers['request-id'] || v4();
      },
    },
    level: {
      doc: 'Default log level',
      format: String,
      default: 'info',
    },
    stream: {
      doc: 'Stream to write logs to',
      default: stdout,
    },
  });

  const config = microfleet.config.get(namespace);

  // create default logger
  if (isValidLogger(config.logger)) {
    log[kLoggerInstance] = config.logger;
  } else if (!config.logger) {
    log[kLoggerInstance] = Object.create(abstractLogging);
    log[kLoggerInstance].child = () => log[kLoggerInstance];
  }

  const log4j = createLogger({
    logger: log[kLoggerInstance],
    level: config.level,
    genReqId: config.genReqId,
    stream: config.stream,
  });

  // provide decorators
  // TODO: add Request decorator and onRequest/onResponse default logging
  microfleet.decorate(namespace, log4j);
}

module.exports = buildLogger;
