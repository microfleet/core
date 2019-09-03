## AMQP Plugin
Based on [Transport AMQP](https://github.com/microfleet/transport-amqp) library.

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
Add plugin name to the list of enabled plugins. Enable the required dependencies as well:
```js
// configs/plugins.js
exports.plugins = [
  'validator',
  'logger', 
  'amqp',
];
```

#### Configure transport
Let's start with connection. By default AMQP transport listens on `localhost:5672`, for more connection options read 
[the schema](https://github.com/microfleet/transport-amqp/blob/master/src/schema.js).
```js
exports.amqp = {
  transport: {
    connection: {
      login: 'alice',
      password: 'i-am-being-set-from-a-very-secure-place'
    },
  }
}
```
#### Send messages using routing keys
##### Publish
Method `publish()` sends a message via routing key.

###### Syntax
```js
amqp.publish(routingKey, message, publishOptions, [parentSpan])
    .then(() => {
      // sent
    })
    .catch((err) => {
      // failed to send
    })
```

###### Parameters
  `routingKey` – Routing key (string)
  `message` – Message to send (mixed)
  `publishOptions` – [Publish options](./amqp/publish-options.md) (object)
  `parentSpan` – Parent span (object, optional)
  
###### Return value
A Promise, which could be resolved with `undefined`, or rejected with an error.

##### Publish and wait
Method `publishAndWait()` sends a message via routing key, as [`publish()`](#publish).

###### Syntax
```js
amqp.publishAndWait(routingKey, message, publishOptions, [parentSpan])
    .then((response) => {
      // do whatever you want
    })
    .catch((err) => {
      // either failed to send or response contained an error - work with it here
    })
```

###### Parameters
  `routingKey` – Routing key (string)
  `message` – Message to send (mixed)
  `publishOptions` –  [Publish options](./amqp/publish-options.md) (object)
  `parentSpan` – Parent span (object, optional)

###### Return value
A Promise, which could be resolved with `undefined`, or rejected with an error. Resolving value depends on the 
publish option `simpleResponse`.

##### Send `amqp.send(queueName, message, publishOptions, [parentSpan])`
Method `send()` allows you to send a message to a queue directly. Otherwise it works similar to [`publish()`](#publish).

###### Syntax
```js
amqp.send(queueName, message, publishOptions, [parentSpan])
```

###### Parameters
  `queue` – Queue name (string)
  `message` – Message to send (mixed)
  `publishOptions` –  [Publish options](./amqp/publish-options.md) (object)
  `parentSpan` – Parent span (object, optional)

##### Send and wait `amqp.sendAndWait(queueName, message, publishOptions, [parentSpan])`
Method `sendAndWait()` allows you to send a message to a queue directly. Otherwise it works similar to [`publishAndWait()`](#publish-and-wait)

###### Syntax
```js
amqp.sendAndWait(queueName, message, publishOptions, [parentSpan])
```

###### Parameters
  `queue` – Queue name (string)
  `message` – Message to send (mixed)
  `publishOptions` –  [Publish options](./amqp/publish-options.md) (object)
  `parentSpan` – Parent span (object, optional)


#### Enable router
AMQP plugin could be used with the router, to make your application routes accessible by AMQP. It maps the routes to 
the routing keys.

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


