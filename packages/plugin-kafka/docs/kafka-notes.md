# `@microfleet/plugin-kafka` and `node-rdkafka`
Please read this docs before start:
* [Apache Kafka topics, groups, rebalance](https://medium.com/streamthoughts/apache-kafka-rebalance-protocol-or-the-magic-behind-your-streams-applications-e94baf68e4f2)
* [librdkafka FAQ](https://github.com/edenhill/librdkafka/wiki/FAQ)
* [librdkafka config](https://github.com/edenhill/librdkafka/blob/v1.2.2/CONFIGURATION.md)

This file tries to cover some generic determinations on how `node-rdkafka` and Kafka work.

## Consume data
Each Kafka topic is divided by partitions (minimal partition count equals to 1).
To achieve parallel consuming of one topic, we must set topic partition count > 1 for it and connect additional consumers.

* When a consumer subscribes to the topic, Kafka assigns specific partitions to the consumer.
* When consumer having same `group.id` subscribes to the topic, Kafka starts the `rebalance` procedure and reassigns partitions for all consumers in the group.
* If consumer count is greater than partition count, some of the consumers will not receive any messages until other consumer disconnects and `rebalance` occurred.
* All consumers paused when `rebalance` begins.
* New connected consumers will start receiving messages from the last partition offset available for the consumer group.

## ConsumerStream Limitations

* If there is no data in the topic, your `for await` loop will be frozen until some data arrived. As an advice, you should set the timeout for the first read.
* `ConsumerStream` is not closed when it reaches EOF for assigned partitions. The developer of the `node-rdkafka` mentions that this is the default [behavior](Blizzard/node-rdkafka#287).

**NOTE:** To achieve precise control on offset commit delivery we can subscribe to `offset.commit` `Consumer` event with `offset_commit_cb` option enabled.

## Produce data
Since `ProducerStream` works like Generic `Writable`, there will be no problems in usage.

**NOTE:** To achieve precise control on message delivery we can subscribe 
to `delivery-report` `Producer` event with `dr_cb` option enabled.

### Produce to the topic that not exists
All current Kafka distros have `auto.create.topics.enable` option set to `True` so:
* When rdkafka Producer tries to send messages to the topic that does not exist, produced messages are stored into the `librdkafka` buffer until Kafka creates a new topic. When the topic is created and the Producer receives metadata all messages sent to the Broker again.

## `node-rdkafka` Internals
* `librdkafka` automatically reconnects on transport failure. If there's data left in buffers, it tries to retransmit data. `node-rdkafka` will receive errors only after all retry attempts failed or timeout reached.
* All Produced messages are accumulated inside `librdkafka`'s buffer and sent to the Broker in batches, on successful delivery `delivery-report` event is emitted for each of the messages from `node-rdkafka`. This works for `offsetCommit` message too.
* Messages from topic could be fetched one by one or in batches with specific intervals.
* If `auto.commit.enable` set to false, you should commit offset manually otherwise `librdkafka` will commit offsets in some intervals.


