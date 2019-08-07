## AMQP Plugin
[future reference](https://github.com/microfleet/transport-amqp)

### Info
| Parameter     | Value       |
|---------------|-------------|
| Name          | `amqp`      |
| Type          | transport   |
| Priority      | 0           |
| Requirements  | [Validator](./validator.md) and [Logger](./logger.md) plugins should be enabled |

### Install
Install the `@microfleet/transport-amqp` package.
```sh
yarn add @microfleet/transport-amqp
```

### How does it work?
// todo few words about the general idea

#### Connector
@todo lifecycle? attach?

| Lifecycle      | What happens        | Emits |
|----------------|---------------------|-------|
| attach         | Checks requirements |       |
| `connect()`    | Establishes connection to amqp transport. Sets up retry logic in case [retry is enabled](#enable-retry).| `plugin:connect:amqp` |
| `close()`      | Closes connection   | `plugin:close:amqp` |
| `status()`     | Is healty when connection has established and is open now  | |


### Usage

#### Enable plugin
Add plugin name to the list of enabled plugins:
```js
// configs/plugins.js
exports.plugins = [
  //...
  'amqp',
];
```

#### Enable router
Register [Router Plugin](./router.md):
```js
// configs/plugins.js
exports.plugins = [
  // ...
  'amqp',
  'router',
  // ...
];
```

Enable AMQP transport in router plugin config:

```js
// configs/router.js
exports.router = {
  routes: {
    transport: {
      transports: [ActionTransport.amqp]
    }
  }
};
```

Enable router in AMQP config:
```js
const { ActionTransport } = require('@microfleet/core');

// configs/amqp.js
exports.amqp = {
  router: {
    enabled: true,
  }
};
```

#### Specify exchange queue

#### Configure router prefix

#### Enable retry
`transport.onComplete` should not be defined
`neck` is ?
retry config https://github.com/microfleet/transport-amqp/blob/a30a9beb6f0b313124d34bc1f083174e5c4a40f6/src/utils/recovery.js

```js
exports.amqp = {
  // ...
  transport: {
    bindPersistantQueueToHeadersExchange: true,
    neck: 10, // must be >= 0 
  },
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

#### Enable decorators

#### Full configuration example
[Schema](../../../schemas/amqp.json)
```js
exports.amqp = {
  router: {
    enabled: true,
    prefix: 'internal'
  },
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
  }
}
```

### Debugging
[future reference](../plugins.md#debugging)


