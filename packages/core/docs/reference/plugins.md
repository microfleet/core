# Plugins
Microfleet Core has plugin system. 
Each plugin is defined with its type, priority within type group and [a connector](#connector-interface) function.

## Enable plugin
Add plugin name to the list of enabled plugins:
```js
// configs/plugins.js
exports.plugins = [
  'validator',
  'logger',
  'amqp',
];
```

## Plugin types
Plugin types are

| Name          | Purpose |
|---------------|---------|
| `application` | What is application plugin |
| `database`    | All database connectors |
| `essential`   | Plugins that the core needs - `validator`, `logger`, `opentracing`, `router` |
| `transport`   | HTTP, AMQP - anything | 

## Plugin priority
Priority is just a number that is responsible for the priority within a group of plugins with the same type.

## Connector
Connector is a function that attaches plugin to a service and could provide following lifecycle methods:

| Method     | Description |
|------------|-------------|
|`connect()` |             |
|`close()`   |             |
|`status()`  |             |

## Debugging

## Plugin list
- [AMQP](plugins/amqp.md)
- [Router](plugins/router.md)
