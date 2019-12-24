# Microfleet Kafka Plugin

Adds Kafka support to microfleet. Provides Stream like API for sending messages to Kafka broker.

For more information please read about [node-rdkafka](https://github.com/Blizzard/node-rdkafka).

## Install

`yarn add @microfleet/plugin-kafka`

## Configuration

To make use of the plugin, adjust microfleet configuration in the following way:

```ts
exports.plugins = [
  ...,
  'kafka',
  ...
]

exports.kafka = {
  // librdkafka configuration
  // https://github.com/edenhill/librdkafka/blob/master/CONFIGURATION.md
  debug: 'consumer,cgrp,topic,fetch',
  'metadata.broker.list': 'kafka:9092',
  'group.id': 'test-group',
}
```

## Interface

Microfleet Kafka Plugin extends service interface with the following methods:

### async service.kafka.createReadStream(streamOpts, connectionOverride, topicOptions): Readable

Initializes Kafka consumer using provided params and creates a Readable stream.
Detailed docs here - https://blizzard.github.io/node-rdkafka/current/KafkaConsumerStream.html

### async service.kafka.createWriteStream(streamOpts, connectionOverride, topicOptions): Writable

Initializes Kafka producer using provided params and creates a Writable stream.
Detailed docs here - https://blizzard.github.io/node-rdkafka/current/ProducerStream.html

## Parameter description

For information about parameters passed to the interface methods:

* `streamOpts` - See [this](https://blizzard.github.io/node-rdkafka/current/KafkaConsumerStream.html) or [this](https://blizzard.github.io/node-rdkafka/current/ProducerStream.html) pages
* `connectionOverride` - See [this page](https://github.com/edenhill/librdkafka/blob/master/CONFIGURATION.md)
* `topicOptions` - See [this page](https://github.com/edenhill/librdkafka/blob/master/CONFIGURATION.md#topic-configuration-properties)

## Example

```js
producer = await service.kafka.createProducerStream(
  { objectMode: true, pollInterval: 10 },
  {'group.id': 'other-group'},
)

consumer = await service.kafka.createConsumerStream(
  { topics: topic, streamAsBatch: true, fetchSize: 10 },
  {
    debug: 'consumer',
    'auto.commit.enable': false,
    'client.id': 'someid',
    'group.id': 'other-group',
  },
  {
    'auto.offset.reset': 'earliest',
  }
)

// and then
producer.write({
  topic,
  value: Buffer.from(`message at ${Date.now()}`),
}, cb)

// or
producer.write(Buffer.from(`message at ${Date.now()}`), cb)

for await (const message of consumer) {
  // process message
}
```
