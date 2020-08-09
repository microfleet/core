# Microfleet DLock Plugin

Wrapper for [Distributed callback queue](https://github.com/AVVS/distributed-callback-queue).

## Install

`yarn add @microfleet/plugin-dlock`

## Configuration

To make use of the plugin adjust microfleet configuration in the following way:

```ts
exports.plugins = [
  ...,
  'redisCluster', // or 'redisSentinel'
  'dlock',
  ...
]

exports.dlock = {
  // pubsubChannel: string;
  // lock?: {
  //   timeout?: number;
  //   retries?: number;
  //   delay?: number;
  // };
  // lockPrefix: string;
}
```

## Interface

Microfleet DLock Plugin extends service interface with the following methods:

### service.dlock: type of 'dlock'

Initialized instance. Look at the docs here - https://github.com/AVVS/distributed-callback-queue
