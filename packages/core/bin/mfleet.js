#!/usr/bin/env node

// determine where we are running
const argv = require('yargs-parser')(process.argv.slice(2));

// prepare variables
const cwd = argv.cwd || process.cwd();
const source = argv.src ? `${cwd}/${argv.src}` : `${cwd}/src`;
const babel = argv.babel || '@swc-node/register';

let Service;
try {
  if (argv.babel !== false) {
    require(babel);
  }

  // make a nice warning that we are running in production, but
  // have <babel-like> stuff here
  if (process.env.NODE_ENV === 'production') {
    console.warn('Service running in production mode, but `%s` was included', babel);
  }

  Service = require(source).default || require(source);
} catch (e) {
  // use package.json -> main
  Service = require(cwd);
}

// init service as there is no top-level async/await
const service = new Service();
(async () => {
  try {
    await service.connect();
  } catch (err) {
    service.log.fatal({ err }, 'service crashed');
    return setImmediate(() => {
      throw err;
    });
  }

  service.log.info('service started');
})();
