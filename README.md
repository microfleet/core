# Microservice core

[![Build Status](https://semaphoreci.com/api/v1/makeomatic/mservice/branches/master/shields_badge.svg)](https://semaphoreci.com/makeomatic/mservice)
[![Code Climate](https://codeclimate.com/github/makeomatic/mservice/badges/gpa.svg)](https://codeclimate.com/github/makeomatic/mservice)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg?style=flat-square)](https://github.com/semantic-release/semantic-release)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)

This module provides boilerplate for microservice core and a few plugins for starters. It sets up convenient `connect` and `close` methods,
logging features, as well as input validation. At the same time it is an event emitter and may send log and other events silently.

## Migration from 2.x to 3.x

Version 3 bring a neat feature of supporting multiple transports and request lifecycle.
Please consult releases page on how to migrate your code

## Usage

Extend Mservice class, populate plugins with array of their names.
Currently supported:

* `amqp`
* `cassandra`
* `elasticsearch`
* `http`
* `logger`
* `redisCluster`
* `redisSentinel`
* `router`
* `socketIO`
* `validator`

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
      transport: {
        queue: 'roundrobin',
      },
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
}

const userService = new UserService();
// methods that userService will have are explain below
```

## Methods

### initPlugin(mod, [conf])

Initializes plugin, which has 2 methods: `.attach` - it would be called with `service` as context and conf as first arg
When `conf` is omitted - it looks for `mod.name` - make sure this is also exported.
`.attach` can return `connect` and `close` functions, which must return promises for starting and stopping the plugin

### hook(event, ...args)

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
It allows the service to communicate over AMQP protocol. If `service.router`
plugin is enabled, then we will make the best attempt to setup listeners
and route incoming messages through this plugin. Attaches `._amqp` to `service`.

Events are emitted when plugin has completed connecting, or disconnecting.
First arg is the transport instance

1. `plugin:connect:amqp`
2. `plugin:close:amqp`

```js
const userService = new UserService({
  amqp: {
    transport: {
      queue: 'my-nice-queue',
      listen: ['users.ping'],
    },
    router: {
      enabled: true
    },
  }
});

// messages that are sent to users.ping will be processed
```

### RedisCluster plugin

***NOTE***: you can use only 1 of the plugins for redis - either cluster or sentinel

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
```

### Redis Sentinel plugin

***NOTE***: you can use only 1 of the plugins for redis - either cluster or sentinel

When using this plugin, make sure you also do `npm i ioredis -S`

Enables redisCluster communication based on `ioredis` module.
Allows one to setup connection to redis and communicate with it in a highly available fashion;

Events are emitted when plugin has completed connecting, or disconnecting. First arg is the transport instance

1. `plugin:connect:redisSentinel`
2. `plugin:close:redisSentinel`

```js
const userService = new UserService({
  plugins: [ 'redisSentinel' ],
  redis: {
    sentinels: [{
      host: '...',
      port: Number
    }],
    name: 'mservice',
    options: {
      // ...
    }
  }
});
```

### Elasticsearch plugin

When using this plugin, make sure you also do `npm i elasticsearch -S`

Enables to use Elasticsearch as a NoSQL storage/search engine. Wraps an official
Elasticsearch JavaScript API module.

Events are emitted when plugin has completed connecting, or disconnecting. First arg is the transport instance

1. `plugin:connect:elasticsearch`
2. `plugin:close:elasticsearch`

```js
const userService = new UserService({
  plugins: [ 'elasticsearch' ],
  elasticsearch: {
    host: 'example.elastic.search:9200',
    apiVersion: '2.1',
    //...
  }
});
```

### Cassandra plugin

When using this plugin, make sure you also do `npm i express-cassandra -S`

Enables to use Cassandra as a NoSQL storage/search engine. Based on `express-cassandra` module.

Events are emitted when plugin has completed connecting, or disconnecting. First arg is the transport instance

1. `plugin:connect:cassandra`
2. `plugin:close:cassandra`

```js
cassandra = require('express-cassandra');

const service = new Service({
  plugins: [ 'cassandra' ],
  cassandra: {
    service: {
      // models also can be path to directory with models
      // https://github.com/masumsoft/express-cassandra#write-a-model-named-personmodeljs-inside-models-directory
      models: {
        Foo: {
          fields:{
            bar: 'text'
          },
          key:['bar']
        }
      }
    },
    client: {
      clientOptions: {
        contactPoints: ['cassandra.srv'],
        protocolOptions: {
          port: 9042
        },
        keyspace: 'mykeyspace',
        queryOptions: {
          consistency: cassandra.consistencies.one
        }
      },
      ormOptions: {
        defaultReplicationStrategy : {
          class: 'SimpleStrategy',
          replication_factor: 1
        },
        dropTableOnSchemaChange: false,
        createKeyspace: true
      }
    }
});
```

### Http plugin

#### Features

 * Allows creating `http` server
 * Predefined handlers support

#### Handlers

You can use one of predefined handlers in `/src/plugins/http/handlers` directory

Allowed handlers at this moment:

 * express (make sure you also do `npm i express -S`)
 * restify (make sure you also do `npm i restify -S`)

#### Peer dependencies

* `npm i server-destroy -S`

#### Events

 * `plugin:start:http`
 * `plugin:stop:http`

#### Usage
```js
const service = new Service({
  plugins: [ 'http' ],
  http: {
    server: {
      attachSocketIO: false, // if true socketio plugin need to be included
      handler: 'restify',
      handlerConfig: {},
      port: 3000,
    }
  }
});

// service.http - server instance depends on handler
```

### Socket.io plugin

#### Features

Attach `Socket.io` instance to `.socketIO` property.

#### Config

* `router`
    * `enabled` - `boolean`, enable router, default `false`
    * `actionEvent` - `string`, an event name that should be emitted 
       for routing, default `action`
    * `requestActionKey` - `string`, an action name key, default `action`
* `options` - `object`, `socket.io` options
    * `adapter` - `object`, adapter
        * `name` - `string`, adapter name, e.g. `amqp`
        * `options` - `object`, adapter options

#### Peer dependencies

* `npm i socket.io -S`
* `npm i ms-socket.io-adapter-amqp -S`

#### Usage
```js
const service = new Service({
  plugins: [ 'socketio' ],
  socketio: {
    router: {
      enabled: true,
    },
    options: {
      // socket.io options
    },
  }
});

// service.socketIO - Socket.io instance
```

### Router plugin

Attach `router` to `service` that can be used by other plugins
