# Usage

#####
amqp-transport: createConsumedQueue -> initRoutingFn


## Install
Install the `@microfleet/transport-amqp` package.
```sh
yarn add @microfleet/transport-amqp
```
``
## Register plugin
`amqp` is a transport level plugin. Register it considering plugins priority.
It also requires `validator` and `logger` plugins enabled. 

```js
// configs/plugins.js
exports.plugins = [
  // ... essential
  'validator',
  'logger',
  // ...database
  // ...transport
  'amqp',
  // ...application
];
```

## Enable router
```js
// configs/plugins.js
exports.plugins = [
  // ... essential
  'validator',
  'logger',
  'router',
  // ...database
  // ...transport
  'amqp',
  // ...application
];
```

```js
const { ActionTransport } = require('@microfleet/core');

// configs/amqp.js
exports.amqp = {
  router: {
    enabled: true,
  }
};

// configs/router.js
// enable AMQP transport in router plugin config
exports.router = {
  routes: {
    transport: {
      transports: [ActionTransport.amqp]
    }
  }
};
```

## Specify exchange queue

## Configure router prefix

## Enable retry
```js
exports.amqp = {
  // ...
  transport: {
    bindPersistantQueueToHeadersExchange: true,
    neck: 10, // must be >= 0
    // onComplete: undefined 
  },
  // more info on retry config https://github.com/microfleet/transport-amqp/blob/a30a9beb6f0b313124d34bc1f083174e5c4a40f6/src/utils/recovery.js
  retry: {
    enabled: true,
    queue: 'cappasity-process-retry-queue', // not required, `x-delay-{$amqp.transport.queue}` by default
    min: 500,
    max: 30 * 60 * 1000, 
    factor: 1.2,
    maxRetries: 10,
    /**
     * When `true` is returned, retry is not performed
     */
    predicate(error, actionName) {
      return true;
    },
  },
}
```

## Enable decorators

# Full configuration example

```js
exports.amqp = {
  transport: {
    name: '@cprocess',
    queue: 'cappasity-process-transport-queue',
    neck: 10,
    defaultQueueOpts: {
      arguments: {
        'x-max-priority': 5,
      },
    },
    bindPersistantQueueToHeadersExchange: true,
    connection: {
      host: 'rabbitmq',
      port: 5672,
    },
    onComplete: (error, data, actionName, message) => {},
  },
  router: {
    enabled: true,
  },
  retry: {
    enabled: true,
    min: 500,
    max: 30 * 60 * 1000,
    factor: 1.2,
    maxRetries: 10,
    queue: 'cappasity-process-retry-queue',
    /**
     * When `true` is returned, retry is not performed
     */
    predicate(error, actionName) {
      return true;
    },
  },
  handler: {
    plugins: [{
      
    }]
  }
}
```

