#!/usr/bin/env node

/* eslint-disable import/no-dynamic-require, no-console */
// determine where we are running
const cwd = process.cwd();

let Service;
try {
  require('babel-register');

  // make a nice warning that we are running in production, but
  // have babel-register
  if (process.env.NODE_ENV === 'production') {
    console.warn('Service running in production mode, but `babel-register` was included');
  }

  Service = require(`${cwd}/src`);
} catch (e) {
  Service = require(`${cwd}/lib`);
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
