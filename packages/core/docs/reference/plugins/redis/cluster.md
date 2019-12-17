# Redis Cluster Plugin
The plugin allows connecting to Redis Server working in Cluster mode.
Internals of this plugin heavily lay on [`ioredis`](https://github.com/luin/ioredis) package with [`BluebirdJs`](http://bluebirdjs.com/) as default Promise engine.

## Dependencies
NPM Packages:
* ioredis
* Bluebird

Other plugins:
* [Validator plugin](../validator.md)

## Methods
| Method | Description |
|--------|-------------|
| `attach(service: Microfleet, opts = {})` | Register plugin for Microfleet `service` with provided `options`.|

## Lifecycle Methods
| Method | Description |
|--------|--|
| `connect()`| Initiates Redis Cluster Connection and starts plugin. |
| `status()` | Get plugin health status. |
| `close()`  | Disconnects from Redis Cluster and deregisters plugin from Microfleet service. |


## Events
| Event name | When  |
|------------|-------|
| `plugin:connect:redisCluster` | Plugin started and connected to Redis Successfully. |
| `plugin:close:redisCluster` | Plugin closed connection to the Redis . |

## Configuration
| Option | Type | Description |
|--------|------|-------------|
| `options` | Object | Configuration options passed to `ioredis` connect method. For further information see [Cluster connection options](https://github.com/luin/ioredis/blob/master/API.md#Cluster) and [Connection options](https://github.com/luin/ioredis/blob/master/API.md#new-redisport-host-options).|
| `hosts` | Array | List of Redis Cluster servers to connect. See [ioredis Custer](https://github.com/luin/ioredis#cluster).|
| `luaScripts` | `String|String[]` | Path to LUA scripts directory. |
