# Knex SQL Query builder plugin

This plugin provides [Knex](http://knexjs.org/) initialization and injecting into Microfleet service.
Knex provides universal interface for querying SQL database services.

## Dependencies

NPM Packages:

* `knex`
* `bluebird-retry`

Other plugins:

* [Validator plugin](../validator.md)
* [Logger plugin](../logger.md)

## Methods

| Method | Description |
|--------|-------------|
| `attach(service: Microfleet, opts = {})` | Register plugin for Microfleet `service` with provided `options`.|

## Lifecycle Methods

| Method | Description |
|--------|--|
| `connect()`| Initiates Knex and connects to SQL server. |
| `status()` | Get plugin health status. |
| `close()`  | Disconnects from SQL server and deregisters plugin from Microfleet service. |

## Events

| Event name | When  |
|------------|-------|
| `plugin:connect:knex` | Plugin started and connected to Redis Successfully. |
| `plugin:close:knex` | Plugin closed connection to the Redis . |

## Configuration

There is no plugin specific configuration options.
Please read [this page](http://knexjs.org/#Installation-client) to find Knex configuration options.
