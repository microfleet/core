# AMQP Plugin

This plugin provides reliable messaging features using RabbitMQ AMQP broker.

## Dependencies

NPM Packages:

* [`@microfleet/transport-amqp`](https://github.com/microfleet/transport-amqp)

Microfleet Plugins:

* [`logger`](./logger.md)
* [`validator`](./validator.md)

## Methods

| Method | Description |
|--------|-------------|
| `attach(service: Microfleet, config)` | Register plugin for the Microfleet `service` with provided [`config`](#configuration)|

## Lifecycle Methods

| Lifecycle      | Description        |
|----------------|---------------------|
| `connect()`    | Initiates connection to the AMQP broker. |
| `close()`      | Stops the AMQP Queue listener and disconnects from the broker.   |
| `status()`     | Gets plugin health status.  |

## Exported Methods and Properties

These properties and methods are available after Plugin initialization under the `service` namespace:

| Method | Description |
|--------|-------------|
| `amqp` | The Instance of the `@microfleet/transport-amqp` package. |
| `amqp.publish(routingKey:string, message:any, [opts:object], [parentSpan])` | Publish message to specified route. |
| `amqp.publishAndWait(routingKey:string, message:any, [opts:object], [parentSpan])` | Publish message to specified route and wait for response. |
| `amqp.send(queueName:string, message:any, [publishOptions:object], [parentSpan])` | Publish message to specified queue directly. |
| `amqp.sendAndWait(queueName:string, message:any, [publishOptions:object], [parentSpan])` | Publish message to specified queue directly and wait for response.  |

Please see [`@microfleet/transport-amqp`](https://github.com/microfleet/transport-amqp) to find the list of all available methods.

### `publishOptions` Object description

The `publishOptions` parameter is a mix of `@microfleet/transport-amqp` internal options and `@microfleet/amqp-coffee` package options.
Here's the list of some general options:
| Option | Type | Default Value | Description |
|--------|------|---------------|-------------|
| `confirm` | `boolean` | `false` | Should plugin wait for confirmation before resolving? |
| `immediate` | `boolean` |  `false` | Waits for the message to be delivered and resolves if it can, rejects otherwise, not implemented by RabbitMQ. |
| `mandatory` | `boolean` | `false` | When true and message can't be routed to a queue – exception returned, otherwise its dropped. |
| `contentType` | `string` | `application/json` | Default content-type for messages. |
| `contentEncoding` | `string`| `plain` | Default content-encoding. |
| `headers` | `object` | `{}` | Headers set. |
| `simpleResponse` | `boolean` | `true` | Whether to return only response data or include headers etc. |
| `deliveryMode` | `number` | `1` | `1` – transient, `2` – saved on disk. |

For additional information please read:

* [`@microfleet/transport-amqp`](https://github.com/microfleet/transport-amqp)  source code and docs.
* [`@microfleet/amqp-coffee`](https://github.com/microfleet/amqp-coffee#connectionpublishexchange-routingkey-data-publishoptions-callback) docs.

## Events

| Event name | When  |
|------------|-------|
| `plugin:connect:amqp` | Plugin started and connected to the AMQP broker. |
| `plugin:close:amqp` | Plugin closed connection to the AMQP broker. |

## Configuration

| Option | Type | Description |
|--------|------|-------------|
| `transport` | Object | See [`@microfleet/transport-amqp`](https://github.com/microfleet/transport-amqp/blob/master/src/schema.js) configuration schema. |
| `[router]` | Object | `Router` plugin integration config. |
| `[retry]`  | Object | Retry strategy configuration |

### `router` Section

| Option | Type | Description |
|--------|------|-------------|
| `enabled` | Boolean | Set to`true` if you need to process incoming AMQP messages using `Router` plugin.|
| `[prefix]` | String | Incoming action prefix. `${prefix}.action` |

### `retry` Section

| Option | Type | Description |
|--------|------|-------------|
| `enabled` | Boolean | Set as `true` to Enable the retry strategy |
| `[queue]` | String | Qeue name to resend messages. Default value is taken from `config.transport.queue` |
| `predicate`| Fn(err: Error, actionName:string):bool | Predicate function that allows to cancel next retry attemps even if `maxRetries` limit not reached. Should return `true` to cancel. |
| `maxRetries` | Number | The Maximum number of retry attempts. |
