# Use of redis{Cluster|Sentinel} plugins
Please read [redisCluster](../reference/redis/cluster.md) and [redisSentinel](../reference/redis/sentinel.md) plugins reference first.

## Recipies:
* [Redis Cluster](#connect-to-redis-cluster)
* [Redis Sentinel](#connect-to-redis-sentinel)
* [HTTP action with Redis command](#create-action-using-redis-family-plugins)
* [Perform additional operations on Successfull connection](#perform-additional-operations)
## Connect to Redis Cluster
### 1. Enable plugin
Enable `RedisCluster` plugin in your service configuration by adding it into `config.plugins` list:

```js
// configs/plugins.js
exports.plugins = [
  'validator',
  'redisCluster'
];
```

### 2. Plugin configuration
Connect to Redis Cluster with nodes running on the same server but with different port:
```js
// configs/redis.js
exports.redis = {
  options: {
    keyPrefix: '{myPrefix}',
    dropBufferSupport: false,
  },
  luaScripts: '/path/to/my/cool-lua-scripts/',
  hosts: Array.from({ length: 3 }).map((_, i) => ({
    host: '172.16.0.10',
    port: 7000 + i,
  })),
}
```

## Connect to Redis Sentinel
### 1. Enable plugin
Enable `redisSentinel` plugin in your service configuration by adding it into `config.plugins` list:

```js
// configs/plugins.js
exports.plugins = [
  'validator',
  'redisSentinel'
];
```

### 2. Plugin configuration
Connect to Redis Sentinel running on local server:
```js
// configs/redis.js
exports.redis = {
  options: {
    keyPrefix: '{myPrefix}',
    dropBufferSupport: false,
  },
  luaScripts: '/path/to/my/cool-lua-scripts/',
  name: 'redis-group-name'
  sentinels: [{
    { host: "localhost", port: 26379 },
  }],
}
```

## Create Action using Redis Family plugins
Get Members from SET `my-key` and return them on HTTP Request:
```js
// actions/redisAction.js
const { ActionTransport } = require('@microfleet/core');

function redisGetAction() {
  const { redis } = this; // this === Microfleet Service
  return redis.smembers('my-key');
}

redisGetAction.transports = [ActionTransport.http];

module.exports = redisGetAction;
```

## Perform additional operations
When you need to initialize additional modules that use Redis or perform some additional actions, you may initialize them when `plugin:connect:redis*` event emitted from `MicrofleetService`:

```js
class MyService extends Microfleet {
  constructor(config) {
    super(config)
    
    // subscribe to plugin events
    this.on(`plugin:connect:redisCluster`, (redis) => {
      // perform your custom operations
    });

    this.on(`plugin:close:redisCluster`, (redis) => {
      // perform your custom operations
    });
  }
}
```
