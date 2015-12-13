# Microservice core

[![Build Status](https://semaphoreci.com/api/v1/projects/b4657eb4-be90-49a7-8077-84a4b4f3aeff/633101/shields_badge.svg)](https://semaphoreci.com/makeomatic/mservice)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg?style=flat-square)](https://github.com/semantic-release/semantic-release)

This module provides boilerplate for microservice core and a few plugins for starters. It sets up convenient `connect` and `close` methods,
logging features, as well as input validation. At the same time it is an event emitter and may send log and other events silently.

## Usage

Extend Mservice class, populate plugins with array of their names. Currently supported: `validator`, `logger`, `amqp` and `redisCluster`


### Events:

1. `ready` - when all plugins are up
2. `close` - when all plugins were disconnected
3. `plugin:connect:pluginName`, `instance`
4. `plugin:close:pluginName`
5. `error`, `err` - on critical error

### Example

```js
const path = require('path');
const Mservice = require('mservice');
const ld = require('lodash');

class UserService extends Mservice {

  /**
   * default options
   * @type {Object}
   */
  static defaultOpts = {
    plugins: ['validator', 'logger', 'amqp', 'redisCluster'],
    redis: {
      hosts: [{
        host: 'localhost',
        port: 6379
      }],
      options: {
        keyPrefix: 'nice'
      }
    },
    amqp: {
      queue: 'roundrobin'
    },
    logger: true,
    // relative paths will be resolved relatively to the first dir of the file
    // on the call stack that is not src/plugins/validator.js or src/index.js
    // keep that in mind when creating instances of services
    //
    // if that's tricky - pass absolute paths!
    validator: [ '../schemas' ],
  }

  constructor(opts = {}) {
    super(ld.merge({}, UserService.defaultOpts, opts));
  }

  /**
   * If specified, amqp plugin will use it when setting up consumers
   */
  router = (message, headers, actions) => {
    // read more about params in makeomatic/ms-amqp-transport
  }

}

const userService = new UserService();
// methods that userService will have are explain below
```

## Methods

### initPlugin(mod, [conf])

Initializes plugin, which has 2 methods: `.attach` - it would be called with `service` as context and conf as first arg
When `conf` is omitted - it looks for `mod.name` - make sure this is also exported.
`.attach` can return `connect` and `close` functions, which must return promises for starting and stopping the plugin

### postHook(event, ...args)

Performs `Promise.map` listeners defined for `event`. All of them are called with the context of the `mservice`
and args are applied as a spread. This is useful when you want to track custom event hooks completion in the app.

Constructor accepts `hooks` Object, which contains of a map of `event` to a `function` or array of `functions`.
They could either be sync or a `promise`.

## Plugins

### Validator plugin

When using this plugin - make sure you `npm i ms-validation -S`

Attaches `ms-validation` instance to your class on `._validator`.
Exposes `.validate` and `.validateSync` methods on the class itself.
Pass array of absolute and relative paths when creating service to automatically include your schemas.
They will be available under basename of the file. If names collide - last schemas will overwrite existing ones

```js
// MixedData - any variable to be checked
userService.validate('schemaName', MixedData)
  .then(mixedData => {
    // passed validation
  })
  .catch(err => {
    // validation failed
  })

const validationResult = userService.validateSync('schemaName');
if (validationResult.error) {
  // validation failed
  // handle error
}

// resulting doc if filter: true was set, otherwise original doc
validationResult.doc
```

### Logger plugin

When using this plugin - make sure you `npm i bunyan -S`

Attaches `.log` method, which is an instance of a `bunyan` logger. Provides sane defaults when `NODE_ENV` is set to `development`.
If not includes ringBuffer trace logger with 100 records. Can accept either a boolean value or an existing custom bunyan instance;
Will have name of `service._config.name` or `mservice`. When `logger` options is set to `true` - will output to stdout, when to `false` - only to
ringBuffer. When debug is on - default log level is `debug`, otherwise - `info`

```js
const userService = new UserService({
  debug: false,
  logger: true
});

// will output data to stdout
userService.log.info('Flying just fine!');

// will only save to ringBuffer stream
userService.log.debug('You won\'t see me!');
```

### AMQP plugin

When using this plugin, make sure you also do `npm i ms-amqp-transport -S`

Enables AMQP transport `makeomatic/ms-amqp-transport`
It allows the service to communicate over AMQP protocol. If `service.router` is defined, then we will make
the best attempt to setup listeners and route incoming messages through this function. Make sure you bind it to your instance
if using any references to `this`. Attaches `._amqp` to `service`.

Events are emitted when plugin has completed connecting, or disconnecting. First arg is the transport instance

1. `plugin:connect:amqp`
2. `plugin:close:amqp`

```js
const userService = new UserService({
  amqp: {
    queue: 'my-nice-queue',
    listen: [ 'users.ping' ],
  }
});

// messages that are sent to users.ping will be processed
```

### RedisCluster plugin

When using this plugin, make sure you also do `npm i ioredis -S`

Enables redisCluster communication based on `ioredis` module.
Allows one to setup connection to redis and communicate with it;

Events are emitted when plugin has completed connecting, or disconnecting. First arg is the transport instance

1. `plugin:connect:redisCluster`
2. `plugin:close:redisCluster`

```js
const userService = new UserService({
  plugins: [ 'redisCluster' ],
  redis: {
    hosts: [{
      host: '...',
      port: Number
    }],
    options: {
      // ...
    }
  }
});

// any redis command will be applicable
