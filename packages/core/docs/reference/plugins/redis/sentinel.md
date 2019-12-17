# Redis Sentinel Plugin
The plugin allows connecting to Redis Server working with Sentinel.
Internals of this plugin heavily lay on [`ioredis`](https://github.com/luin/ioredis) package with [`BluebirdJs`](http://bluebirdjs.com) as default Promise engine.

## Dependencies
NPM packages:
* ioredis
* Bluebird

Plugin depends on other plugins:
* [Validator plugin](../validator.md)

## Methods
| Method | Description |
|--------|-------------|
| `attach(service: Microfleet, config = {})` | Register plugin for Microfleet `service` with provided `config`.|


## Lifecycle
| Method | Description |
|--------|-------------|
| `connect()`| Initiates Redis Cluster Connection and starts plugin. |
| `status()` | Get plugin health status. |
| `close()`  | Disconnects from Redis Cluster and deregisters plugin from Microfleet service. |


## Events
| Event name | When  |
|------------|-------|
| `plugin:connect:redisSentinel` | Plugin started and connected to Redis Successfully. |
| `plugin:close:redisSentinel` | Plugin closed connection to the Redis.  |

## Configuration
| Option | Type | Description |
|--------|------|-------------|
| `options` | Object | Configuration options passed to `ioredis` connect method. For further information see [Connection options](https://github.com/luin/ioredis/blob/master/API.md#new-redisport-host-options)|
| `sentinels` | Array | List of Redis Sentinels to connect. See [ioredis Sentinel](https://github.com/luin/ioredis#sentinel)  |
| `name` | Group name of the Redis instances on Sentinel |
| `luaScripts` | `String|String[]` | Path to LUA scripts directory. |
