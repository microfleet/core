# Using Redis Migrations
In the previous [recipe](./redis.md), you learned how to connect to the Redis server.
In this recipe, you will learn how to configure your `Microfleet` service to perform migrations on Redis data.

## Prerequisites:
* Microfleet service with configured `redisCluster` or `redisSentinel` plugin. For more information please refer [this recipe](./redis.md)
* Installed `Redis` server. 
  
## Service configuration

First of all, we should enable migrations in our microservice. The `RedisCluster` or `RedisSentinel` plugins provide migration handling features by default, but they are disabled.

Let's enable them by adding the following lines into your main microservice class:

```javascript
class DemoApp extends Microfleet {
  constructor(opts = {}) {
    super(merge({}, config, opts))
    // ...
    this.addConnector(ConnectorsTypes.migration, () => (
      this.migrate('redis', `${__dirname}/../migrations`)
    ), 'redis-migration')
    // ...
  }
}
```

By adding these lines of code, we explicitly enable migrations for Redis and instruct the `Redis*` plugin to look for migrations in the `./migrations` directory.

## Fill up your storage (Javascript migration)
For now, your Redis has no data stored. Let's create our first migration, that will create some keys and fill them with data:

```javascript
// migrations/redis/01_create_constants/index.js

async function createConstantKeys(service) {
  const { redis } = service
  const pipeline = redis.pipeline()
  pipeline.set('some.key')
  pipeline.sadd('some.set', 'value')
  pipeline.sadd('some.set', 'other value')

  await pipeline.exec()
}

module.exports = {
  min: 0,
  final: 1,
  script: createConstantKeys,
}
```

In this migration, we described that it should be applied first, using `min: 0 ` property.
After the successful execution of the migration, the version of the storage will be equal to `1`.

After you started your microservice, you can connect to the Redis server and check that the database contains correct data and the `version` key is equal to 1:

```console
user@$: redis-cli
127.0.0.1> keys *
1) "{demo-app}some.set"
2) "{demo-app}version"
127.0.0.1> smembers {demo-app}some.set
1) "other value"
2) "value"
127.0.0.1> get {demo-app}version
"1"
```

## Delete keys (Lua script migration)
In this case, we will try to delete some keys, but with migration that uses Lua script. 
Lua script allows us to perform atomic operations on Redis keys.

Let's start with:

```javascript
// migrations/redis/02_lua_migration/index.js

module.exports = {
  min: 1,
  final: 2,
  script: `${__dirname}/data_update.lua`,
}
```

```lua
-- migrations/redis/02_lua_migration/data_update.lua
redis.call('del', 'some.key')
redis.srem('some.set', 'value')
redis.sadd('some.set', 'new value')
```

After you started your microservice, you can connect to the Redis server and check that the migration has been executed correctly and the `version` key is equal to 2:

```console
user@$: user@$: redis-cli
127.0.0.1> keys *
1) "{demo-app}some.set"
2) "{demo-app}version"
127.0.0.1> get {demo-app}version
"2"
127.0.0.1> smembers {demo-app}some.set
1) "other value"
2) "new value"
```
