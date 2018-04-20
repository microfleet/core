#!/usr/bin/env node

const raven = require('raven');
const Parse = require('fast-json-parse');
const split = require('split2');
const pump = require('pump');
const fs = require('fs');
const stdout = require('stdout-stream');
const omit = require('lodash.omit');
const { signals } = require('os').constants;
const { multistream } = require('pino-multi-stream');

const levels = {
  silent: Infinity,
  fatal: 60,
  error: 50,
  warn: 40,
  info: 30,
  debug: 20,
  trace: 10,
};

const yargs = require('yargs')
  .option('dsn', {
    description: 'sentry DSN to write to',
    required: true,
  })
  .option('sentry', {
    description: 'sentry configuration options - https://docs.sentry.io/clients/node/config/',
    default: {},
  })
  .option('level', {
    description: 'minimum log level',
    type: 'number',
    default: 30,
    coerce(level) {
      if (level in levels) {
        return levels[level];
      }

      return level;
    },
  })
  .config()
  .help()
  .version();

function pinoSentry(opts) {
  // https://docs.sentry.io/clients/node/config/
  const client = new raven.Client(opts.dsn, opts.sentry);

  function getSentryLevel(record) {
    const { level } = record;

    if (level >= 50) return 'error';
    if (level === 40) return 'warning';

    return 'info';
  }

  function deserializeError(data) {
    if (data instanceof Error) return data;

    // TODO: remap error according to serialization that we will have
    const error = new Error(data.message);
    error.name = data.name;
    error.stack = data.stack;
    error.code = data.code;
    error.signal = data.signal;
    return error;
  }

  function write(record) {
    const { err, tags } = record;
    const level = getSentryLevel(record);

    if (err) {
      const extra = omit(record, 'err', 'tags');
      client.captureException(deserializeError(err), { extra, level, tags });
    } else {
      const extra = omit(record, 'msg', 'tags');
      client.captureMessage(record.msg, { extra, level, tags });
    }

    return (true);
  }

  return { write };
}

module.exports = pinoSentry;

function start(opts) {
  function parseLine(line) {
    const parsed = new Parse(line);
    if (parsed.err) {
      this.emit('unknown', line, parsed.err);
      return undefined;
    }

    const { value } = parsed;
    if (typeof value === 'string') {
      this.emit('unknown', line, value);
      return undefined;
    }

    if (value.level < opts.level) {
      return undefined;
    }

    return value;
  }

  pump(process.stdin, split(parseLine), multistream([
    { stream: pinoSentry(opts) },
    { stream: stdout },
  ]));

  // skips closing early
  if (!process.stdin.isTTY && !fs.fstatSync(process.stdin.fd).isFile()) {
    process.once(signals.SIGINT, () => {});
    process.once(signals.SIGTERM, () => {});
  }
}

if (require.main === module) {
  start(yargs.argv);
}
