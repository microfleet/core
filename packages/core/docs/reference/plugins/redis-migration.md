# RedisCluster or RedisSentinel plugin migrations

`@microfleet/plugin-redis` database migrations provide an ability to update your Redis key and contents.
Migration interface of the `@microfleet/plugin-redis` plugin, should be registered as `Connector` with type `ConnectorType.migration` inside `@microfleet/core` service.

## Dependencies

NPM Packages:

* `@microfleet/plugin-redis`

## Methods

| Method                             | Description         |
| ---------------------------------- | --------------------|
| `service.migrate('redis', config: string | string[])` | Applies migrations. |

The `config` parameter of the `migrate` method accepts `string` as a path to the directory that contains migrations or `string[]` with the migration files list.

## Migration interface

Each migration file should export:

| Field | Description | 
| ----- | ----------- |
| `min: number` | The version of the previous migration. Used as an order identifier, describes when migration should be applied. |
| `final: number` | The next version number value, set if the migration applied. |
| `script: string | function(service: Microfleet):Promise<any>` | Path to the Lua script or the function that executes migration procedures. |
| `[keys]: string[]` | The Redis Keys list passed to the Lua script. |
| `[args]: any[]` | The Arguments list passed to the Lua script. |

## NOTE
Please avoid write operations on Redis during migration execution.

#### Example

#### Javascript migration:

```javascript

async function updateData({ redis, config, log }) {
  await redis.del(someKey);
}

module.exports = {
  script: updateData,
  min: 4,
  final: 5,
};
```

#### LUA script migration

```javascript
module.exports = {
  script: `${__dirname}/migration.lua`,
  min: 5,
  final: 6
  keys: [ 'firstKey', 'secondKey' ],
}
```
Because the migration process wraps the Lua script with some Lua code, you should access your keys using `index+1`.
The arguments `index` stays the same.

```lua
local firstKey = KEYS[2]
local secondKey = KEYS[3]

redis.call("DEL", firstKey)
redis.call("SADD", secondKey)
```



