#!/usr/bin/env node

const debug = require('debug')('microfleet:cli');
const { argv } = require('yargs')
  .usage('$0 [file] --cwd string --dev boolean')
  .option('cwd', {
    default: process.cwd(),
    description: 'launch service from here',
    normalize: true,
  })
  .option('dev', {
    default: false,
    type: 'boolean',
    description: 'tries to include @babel/register OR babel-register if present',
  });

const safeRequire = (mod) => {
  try {
    require(mod);
    return true;
  } catch (e) {
    return false;
  }
};

// enable console
debug.enable('microfleet:cli');

// ensure working dir is defined
if (argv.cwd !== process.cwd()) {
  debug('Changing working dir to %s', argv.cwd);
  process.chdir(argv.cwd);
}

// prepare
if (argv.dev) {
  if (process.env.NODE_ENV === 'production') {
    debug('Service running with "production" env but --dev specified');
  }

  if (safeRequire('@babel/register') === false &&
      safeRequire('babel-register') === false) {
    debug('--dev was specified, but unable to load both @babel/register & babel-register');
    process.exit(128);
  }

  if (!argv.file) {
    argv.file = './src';
  }
} else if (!argv.file) {
  argv.file = './lib';
}

(async function launchService() {
  try {
    const MicrofleetService = require(argv.file);
    await MicrofleetService.connect();
  } catch (e) {
    debug('Failed to start service');
    debug(e);
    process.exit(128);
  }
}());
