# Microfleet Consul Plugin

Adds consul support to microfleet. This can be used to perform
service discovery, leader election and other related tasks
Read more about Consul at https://www.consul.io

## Install

`yarn add @microfleet/plugin-consul`

## Configuration

To make use of the plugin adjust microfleet configuration in the following way:

```ts
exports.plugins = [
  ...,
  'consul',
  ...
]

/* this section is optional */
exports.consul = {
  base: {
    host?: string; // consul-agent host instance
    port?: string; // consul-agent port
    secure?: boolean; // https?
    ca?: string[]; // custom CA
    defaults?: { // used for all queries to consul
      consistent?: boolean;
      dc?: string;
      stale?: boolean;
      token?: string;
      wait?: string;
      wan?: boolean;
      timeout?: number;
    }
  },
  lock: {
    key?: string; // defaults `microfleet/${config.name}/leader`,
    session?: Object | string; // session settings
    value?: string | Buffer; // arbitrary data
    lockwaittime?: string;
    lockretrytime?: string;
  }
}
```

## Interface

Microfleet Consul Plugin extends service interface with the following methods:

### service.consul: consul.Consul

Initialized instance. Look at the docs here - https://www.npmjs.com/package/consul#documentation

### service.consulLeader: consul.Lock

Initialized leader election lock. Detailed docs here - https://www.npmjs.com/package/consul#lock

### service.whenLeader(): Promise<boolean>

Use this to wait until current instance becomes a leader.

```ts
// will lock until instance is a leader
// or until service.close() is called
const isLeader = await service.whenLeader()
if (isLeader === true) {
  ... // means we've acquired leader
} else {
  ... // this means that instance is closing down
}
```
