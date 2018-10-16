#!/usr/bin/env node

/* eslint-disable import/no-dynamic-require, import/no-unresolved,  no-console */
// determine where we are running
const argv = require('yargs-parser')(process.argv.slice(2));

// prepare variables
const cwd = argv.cwd || process.cwd();
const source = argv.src ? `${cwd}/${argv.src}` : `${cwd}/src`;
const lib = argv.lib ? `${cwd}/${argv.lib}` : `${cwd}/lib`;
const babel = argv.babel || 'ts-node/register';

let Service;
try {
  if (argv.babel !== false) {
    require(babel);
  }

  // make a nice warning that we are running in production, but
  // have babel-register
  if (process.env.NODE_ENV === 'production') {
    console.warn('Service running in production mode, but `babel-register` was included');
  }

  Service = require(source).default;
} catch (e) {
  Service = require(lib).default;
}

// init service
const service = new Service();

// connect
service
  .connect()
  .asCallback((err) => {
    if (err) {
      service.log.fatal('service crashed', err);
      throw err;
    }

    service.log.info('service started');
  });
