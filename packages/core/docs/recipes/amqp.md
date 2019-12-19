# Use of the AMQP Plugin

For communication between different services, you can use a lot of protocols. In this recipe, we will try to use the AMQP Protocol plugin to communicate our service and configure the message resending in case of errors.

* [Service configuration](#service-configuration)
* [Communication](#communication-between-microfleet-based-services)
* [Resending messages](#amqp-plugin-retry-configuration)

## Prerequisites

* Please read [Wiki](https://en.wikipedia.org/wiki/Advanced_Message_Queuing_Protocol) in case you didn't hear anything about AMQP.
* Installed `RabbitMQ` server. Please see [this page](https://www.rabbitmq.com/download.html) . Further, you can use other AMQP Servers.

If you don't want to install RabbitMQ into your system, you may use Docker:

```console
$@: docker run -it --rm --hostname my-rabbit --name some-rabbit -p 8080:15672 -p 5672:5672 rabbitmq:3-management
```

## Future Service

* Will perform requests to other services and respond to requests.
* Will respond to AMQP messages for `demoService.amqp-demo` routing key.

## Service configuration

First of all, we will need to enable `AMQP Plugin` in our service.

Please read [AMQP Plugin](../reference/plugins/amqp.md) for additional configuration options and information.

### 1. Enable plugin

Add plugin name to the list of enabled plugins. Enable the required dependencies as well:

```js
// configs/plugins.js
exports.plugins = [
  'validator',
  'logger',
  'amqp',
  'http', // we will expose HTTP endpoint to test our service
]
```

### 2. Configure transport

Let's start with the connection configuration. By default AMQP transport listens on `localhost:5672`:

```js
// configs/amqp.js
exports.amqp = {
  transport: {
    connection: {
      // remove these settings if you use the bare docker image
      login: 'mquser',
      password: 'i-am-being-set-from-a-very-secure-place'
    },
  }
}
```

Now you can start your service and check that the connection to AMQP broker was successful:

```console
$user@: yarn start
yarn start
yarn run v1.19.1
$ mfleet
[2019-11-28 13:15:10.310 +0000] INFO  (demo-app/4190 on localhost): ready
    pluginName: "amqp"
    connectorType: "transport"
[2019-11-28 13:15:10.336 +0000] INFO  (demo-app/4190 on localhost): connected to rabbit@my-rabbit v3.8.1
    namespace: "@microfleet/transport-amqp"
[2019-11-28 13:15:10.338 +0000] INFO  (demo-app/4190 on localhost): ready
    pluginName: "amqp"
    connectorType: "transport"
[2019-11-28 13:15:10.405 +0000] INFO  (demo-app/4190 on localhost): service started

```

## Communication between `Microfleet` based services

When plugin is successfully enabled, we can try to send messages to other services.
For now, our service will perform requests to itself using AMQP.

*If you need to create a service that only retrieves data from another service, you can omit all `router` configuration.

To achieve this, we need to create two actions and configure `Router plugin` and `AMQP plugin`.

### 1. Configuration

The default `router` configuration does not include the `AMQP plugin`, so we must enable it:

```js
// configs/router.js
const { ActionTransport } = require('@microfleet/core');

exports.router = {
  ...
  routes: {
    transports: [ ActionTransport.amqp, ActionTransport.http ],
    prefix: 'demo-app', // You should define this value to avoid intercepting actions between different services.
  },
  ...
}
```

Now Update your `amqp` config file by adding additional `router` section:

```js
// configs/amqp.js
exports.amqp = {
  ...
  router: {
    enabled: true,
    // prefix: 'pref' // The routing key will look like `pref.demo-app.path.action` if you defined prefix in `router` and `amqp`.
  }
  ...
}

```

Now you can start your service and check that the configuration was successful:

```console
$user: yarn start
yarn run v1.19.1
$ mfleet
...
[2019-11-28 14:43:38.585 +0000] INFO  (demo-app/13051 on localhost): connected to rabbit@my-rabbit v3.8.1
    namespace: "@microfleet/transport-amqp"
[2019-11-28 14:43:38.608 +0000] INFO  (demo-app/13051 on localhost): queue created
    namespace: "@microfleet/transport-amqp"
    queue: "amq.gen-GMcyIHZb8VvlEiwzgqENLw"
[2019-11-28 14:43:38.609 +0000] INFO  (demo-app/13051 on localhost): consumer is being created
    namespace: "@microfleet/transport-amqp"
    queue: "amq.gen-GMcyIHZb8VvlEiwzgqENLw"
[2019-11-28 14:43:38.613 +0000] DEBUG (demo-app/13051 on localhost): retrieved routes
    namespace: "@microfleet/transport-amqp"
    routes: [
      "demo-app.generic.health"
    ]
    previousRoutes: []
[2019-11-28 14:43:38.614 +0000] DEBUG (demo-app/13051 on localhost): bind routes->exchange ["demo-app.generic.health"] node-services
    namespace: "@microfleet/transport-amqp"
[2019-11-28 14:43:38.624 +0000] DEBUG (demo-app/13051 on localhost): bound queue to exchange
    namespace: "@microfleet/transport-amqp"
    queueName: "amq.gen-GMcyIHZb8VvlEiwzgqENLw"
    exchange: "node-services"
    routingKey: "demo-app.generic.health"
[2019-11-28 14:43:38.625 +0000] INFO  (demo-app/13051 on localhost): consumed-queue-reconnected
    namespace: "@microfleet/transport-amqp"
    queueName: "amq.gen-GMcyIHZb8VvlEiwzgqENLw"
    consumerTag: "localhost-13051-1574952218611"
[2019-11-28 14:43:38.625 +0000] DEBUG (demo-app/13051 on localhost): bound `ready` to establishConsumer
    namespace: "@microfleet/transport-amqp"
    listen: [
      "demo-app.generic.health"
    ]
    queue: "amq.gen-GMcyIHZb8VvlEiwzgqENLw"
...
[2019-11-28 14:43:38.655 +0000] INFO  (demo-app/13051 on localhost): listening on http://0.0.0.0:3000
    transport: "http"
    http: "@hapi/hapi"
[2019-11-28 14:43:38.655 +0000] INFO  (demo-app/13051 on localhost): ready
    pluginName: "http"
    connectorType: "transport"
[2019-11-28 14:43:38.655 +0000] INFO  (demo-app/13051 on localhost): service started

```

### 2. AMQP action

We will need action, that responds to AMQP messages. Generally, you can create a single action that responds to many types of transports.

```js
// src/actions/amqp/consumer.js
const { ActionTransport } = require('@microfleet/core')

function consumerAction(req) {
  // wrap incoming message data and respond with it
  return { processed: req.params, time: new Date() }
}

// Shows that this is AMQP action.
consumerAction.transports = [ActionTransport.amqp]

module.exports = consumerAction
```

### 3. HTTP action

And of course, we need an HTTP action that will retrieve some information using the `AMQP Plugin`.
This action will try to publish `{ hello: 'world'}` Object using different methods of the plugin.

#### Send a message using the routing key

Generally, all `Microfleet`  services use this type of connection.
If you want to send a message to other applications that listen to specific routing key, you can use these methods:

1. publishAndWailt(routingKey, message) - sends a message and waits for the response
2. publish(routingKey, message) - just sends.

```js
const { ActionTransport } = require('@microfleet/core')

async function publishAction() {
  const { amqp } = this;
  const pResult = await amqp.publish('demo-app.amqp.consumer', { hello: 'world' })
  const pwResult = await amqp.publishAndWait('demo-app.amqp.consumer', { hello: 'world wait' })
  
  return {
    pwResult,
    pResult,
  }
}

publishAction.transports = [ActionTransport.http]

module.exports = publishAction

```

#### Send a message to a specific queue

When you need to send messages to a specific queue, you can use:

* sendAndWailt(queueName, message) - sends a message and waits for the response.
* send(queueName, message) - just sends.

These methods provide the same functionality as the methods described before.

### Check what we got

As a final step, we can start our service and check that everything is working:

```console
$user@: yarn start
...
[2019-11-28 15:08:23.183 +0000] DEBUG (demo-app/14661 on localhost): bound `ready` to establishConsumer
    namespace: "@microfleet/transport-amqp"
    listen: [
      "demo-app.amqp.consumer",
      "demo-app.generic.health"
    ]
    queue: "amq.gen-SwcbT99YI9C14v1tPI2k3w"
....
[2019-11-28 15:08:23.224 +0000] INFO  (demo-app/14661 on localhost): listening on http://0.0.0.0:3000
    transport: "http"
    http: "@hapi/hapi"
...
[2019-11-28 15:08:23.226 +0000] INFO  (demo-app/14661 on localhost): service started

```

In other console execute:

```console
$user@: curl http://localhost:3000/demo-app/amqp/publish | jq
{
  "pwResult": {
    "processed": {
      "hello": "world wait"
    },
    "time": "2019-11-28T15:11:03.413Z"
  }
}
```

As you can see, our HTTP action successfully retrieved some data using AMQP.

## AMQP plugin `retry` configuration

Any super stable environment could produce some errors like undelivered messages or other service failures. In this situation, you can configure your service to retry sending messages depending on your needs.

Let's create configure our `AMQP plugin` retry strategy and try to simulate some problems in our services.

### 1. Update configuration

First of all, we need to configure `retry` options for the plugin. There are some mandatory options,
that should be defined manually.

```js
// configs/amqp.js
exports.amqp = {
  // ...
  transport: {
    // ...
    neck: 10,
    bindPersistantQueueToHeadersExchange: true, // this option also required
    queue: 'my-queue-123' // you must provide manual queue name
  },
  // And the most interesting part
  retry: {
    enabled: true, // false to disable retry attempts
    min: 100,
    max: 30 * 60 * 1000,
    factor: 1.2,
    maxRetries: 3, // 3 attempts only
    predicate(error, actionName) {
      if (actionName === 'demo-app.amqp.consumer') {
        if (error instanceof Errors.TimeoutError) {
          // we should retry sending message
          return false
        }
      }
      // abort retry
      return true
    },
  },
}
```

For information about `min`, `max`, `factor` parameters consult [this page](https://github.com/microfleet/transport-amqp/blob/master/src/utils/recovery.js). These parameters used to configure retry interval settings.

The plugin uses the `predicate` function as a circuit breaker to stop retry attempts. 
We will check whether an action was `demo-app.amqp.consumer` and error was `Errors.TimeoutError`, and  If condition requirements met, the plugin will continue retry attempts. For other actions and errors, we don't need to resend the message.

### 2. AMQP Action with error

Now we need to update our [action](#2.-amqp-action) with the following code:

```js
// src/actions/amqp/consumer.js
const { ActionTransport } = require('@microfleet/core')
const Errors = require('common-errors');

async function consumerAction(req) {
  // read AMQP headers
  const { headers } = req.headers;
  const retryCount = headers['x-retry-count'] || 0

  if (retryCount < 2) {
    throw new Errors.TimeoutError(`100ms`)
  }
  return { processed: req.params, time: new Date() }
}

consumerAction.transports = [ActionTransport.amqp]

module.exports = consumerAction
```

Action will read incoming AMQP message headers and throw error two times and then return success response.

### 3. Check That Everything is working

Now you can start your service and perform some requests on failing action. You will see that even an action threw some errors, the successful response received:

```console
$user@: curl http://localhost:3000/demo-app/amqp/publish | jq
{
  "pwResult": {
    "processed": {
      "hello": "world wait"
    },
    "time": "2019-12-05T10:08:07.398Z"
  }
}
```

You can check console with service running and see that some retry attempts logged:

```console
[2019-12-05 10:08:07.076 +0000] WARN  (demo-app/7020 on localhost): Retry: [demo-app.amqp.consumer]
    namespace: "@microfleet/transport-amqp"
    err: {
      "type": "TimeoutError",
      "message": "Timeout of '100ms' exceeded",
      "stack":
          TimeoutError: Timeout of '100ms' exceeded
      "args": {
        "0": "100ms"
      },
      "time": "100ms",
      "name": "TimeoutError",
      "retryAttempt": 0
    }
    properties: {
      "contentType": "application/json",
      "contentEncoding": "plain",
      "headers": {
        "reply-to": "microfleet.36fabee4-fee0-4e14-86ea-4f892ad8ecc6",
        "timeout": 10000
      },
      "deliveryMode": 1,
      "correlationId": "5446ffda-b238-4610-8a27-192b9f9911cf",
      "replyTo": "microfleet.36fabee4-fee0-4e14-86ea-4f892ad8ecc6",
      "expiration": "9000",
      "appId": "{\"name\":\"amqp\",\"host\":\"localhost\",\"pid\":7020,\"utils_version\":\"15.0.0\",\"version\":\"n/a\"}"
    }
[2019-12-05 10:08:07.077 +0000] DEBUG (demo-app/7020 on localhost): queued retry message
    namespace: "@microfleet/transport-amqp"
```
