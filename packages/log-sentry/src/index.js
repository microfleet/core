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

const yargs = require('yargs')
  .option();

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

function parseLine(line) {
  const parsed = new Parse(line);
  if (parsed.err) {
    this.emit('unknown', line, parsed.err);
    return undefined;
  }

  const { value } = parsed;
  if (typeof value === 'string') {
    // TODO .... havent been able to parse
  } else {
    // TODO ... havent
  }

  return value;
}

module.exports = pinoSentry;

function start(opts) {
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
