import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Microfleet } from '@microfleet/core'
import { once, EventEmitter } from 'node:events'
import { promisify } from 'node:util'
import { Toxiproxy } from 'toxiproxy-node-client'
import { pipeline as p, Writable } from 'node:stream'
import { setTimeout } from 'node:timers/promises'
import stringify from 'fast-json-stable-stringify'
import * as sinon from 'sinon'

import {
  KafkaConsumerStream,
  KafkaProducerStream,
  TopicNotFoundError,
  OffsetCommitError,
  UncommittedOffsetsError,
  Message,
  RdKafkaCodes,
} from '@microfleet/plugin-kafka'

import { createProducerStream, createConsumerStream, sendMessages, msgsToArr, readStream, commitBatch } from '../helpers/kafka'

const pipeline = promisify(p)
const toxiproxy = new Toxiproxy('http://toxy:8474')

test('#generic', async (t) => {
  let service: Microfleet
  let producer: KafkaProducerStream
  let consumerStream: KafkaConsumerStream

  t.beforeEach(async () => {
    service = new Microfleet({
      name: 'tester',
      plugins: ['logger', 'validator', 'kafka'],
      kafka: {
        'metadata.broker.list': 'kafka:9092,',
        'group.id': 'test-group',
        'fetch.wait.max.ms': 300,
      },
    })
    await service.register()
  })

  t.afterEach(async () => {
    sinon.restore()
    if (service) await service.close()
  })

  await t.test('connect', async (t) => {
    await t.test('should be able to create a producer stream', async () => {
      const { kafka } = service
      producer = await kafka.createProducerStream({
        streamOptions: { objectMode: false, topic: 'testBoo' },
      })

      assert.ok(producer)
    })

    await t.test('should be able to create a consumer stream', async () => {
      const { kafka } = service

      producer = await kafka.createProducerStream({
        streamOptions: { objectMode: false, topic: 'testBoo' },
        topicConf: {
          'request.required.acks': 1,
        },
        conf: {
          dr_msg_cb: true,
        },
      })

      producer.write('some')
      await once(producer.producer, 'delivery-report')

      consumerStream = await kafka.createConsumerStream({
        streamOptions: { topics: ['testBoo'] },
      })

      assert.ok(consumerStream)
    })

    await t.test('should be able to get Admin client and create/delete topic', async () => {
      const { kafka } = service
      const readyTopic = {name: 'manually-created', partitions: [{id: 0, isrs: [1], leader: 1, replicas: [1]}]}
      const topic = 'manually-created'

      const producerTemp = await kafka.createProducerStream({
        streamOptions: { objectMode: true },
      })

      const { admin } = kafka

      await admin.createTopic({
        topic: { topic, num_partitions: 1, replication_factor: 1 },
        params: {
          max_tries: 40,
          interval: 1000,
          max_interval: 5000,
          timeout: 60000,
        }
      })
      const meta = await producerTemp.producer.getMetadataAsync({ allTopics: true })
      assert.equal(meta.topics.some(t =>
        stringify(t) === stringify(readyTopic)
      ), true, JSON.stringify({ topics: meta.topics.find(t => t.name === readyTopic.name), readyTopic }))

      await admin.deleteTopic({
        topic,
        params: {
          interval: 1000,
        },
      })

      const metaAfter = await producerTemp.producer.getMetadataAsync({ topic })
      assert.deepStrictEqual(metaAfter.topics.some(t =>
        stringify(t) === stringify(readyTopic)
      ), false)
    })

    await t.test('should be able to get Admin client and create/delete topic and reuse passed client', async () => {
      const { kafka } = service
      const topic = `manually-created-2-${Date.now()}`
      const readyTopic = {name: topic, partitions: [{id: 0, isrs: [1], leader: 1, replicas: [1]}]}

      const producerTemp = await kafka.createProducerStream({
        streamOptions: { objectMode: true },
      })

      const { admin } = kafka

      await admin.createTopic({
        client: producerTemp.producer,
        topic: { topic, num_partitions: 1, replication_factor: 1 },
        params: {
          max_tries: 40,
          interval: 1000,
          max_interval: 5000,
          timeout: 60000,
        }
      })
      const meta = await producerTemp.producer.getMetadataAsync({ allTopics: true })
      assert.equal(meta.topics.some(t =>
        stringify(t) === stringify(readyTopic)
      ), true, JSON.stringify({ topics: meta.topics.find(t => t.name === readyTopic.name), readyTopic }))

      await admin.deleteTopic({
        topic,
        client: producerTemp.producer,
        params: {
          max_tries: 20,
          interval: 1000,
          timeout: 20000,
        }
      })
      const metaAfter = await producerTemp.producer.getMetadataAsync({ topic })
      assert.deepStrictEqual(metaAfter.topics.some(t =>
        stringify(t) === stringify(readyTopic)
      ), false)
    })

    await t.test('consumer missing topic', async (t) => {
      await t.test('with allTopics: true', async () => {
        const { kafka } = service

        const req = kafka.createConsumerStream({
          streamOptions: {
            checkTopicExists: true,
            topics: ['test-not-found'],
            connectOptions: { allTopics: true }
          },
          conf: {
            'group.id': 'consumer-all-topics-meta',
          },
        })

        await assert.rejects(req, TopicNotFoundError)
      })

      await t.test('with topic: value', async () => {
        const { kafka } = service

        const req = kafka.createConsumerStream({
          streamOptions: {
            checkTopicExists: true,
            topics: ['test-not-found'],
            connectOptions: { topic: 'test-not-found' }
          },
          conf: {
            'group.id': 'consumer-one-topic-meta',
          },
        })

        await assert.rejects(req, TopicNotFoundError)
      })

      await t.test('topic as RegExp', async () => {
        const topic = 'exists-for-regexp'

        producer = await createProducerStream(service)
        await sendMessages(producer, topic, 10)

        const req = createConsumerStream(service, {
          streamOptions: {
            checkTopicExists: true,
            topics: [
              /^some-topic/,
              /^exists/,
            ],
          },
          conf: {
            'group.id': topic,
          },
        })

        await assert.rejects(req, TopicNotFoundError)
      })
    })
  })

  await t.test('conn-track', async (t) => {
    await t.test('tracks streams', async () => {
      const { kafka } = service

      const streamToClose = await kafka.createProducerStream({
        streamOptions: { objectMode: false, topic: 'testBoo' },
        conf: {
          dr_msg_cb: true,
        },
        topicConf: {
          'delivery.timeout.ms': 1500,
        },
      })

      streamToClose.write('create me please')
      await once(streamToClose.producer, 'delivery-report')

      const streamToCloseToo = await kafka.createConsumerStream({
        streamOptions: { topics: 'testBoo' },
        conf: { 'group.id': 'track-group' },
        topicConf: { 'auto.offset.reset': 'earliest' },
      })

      assert.equal(kafka.getStreams().size, 2)

      await streamToClose.closeAsync()
      assert.equal(kafka.getStreams().size, 1)

      await streamToCloseToo.closeAsync()
      assert.equal(kafka.getStreams().size, 0)
    })

    await t.test('closes streams on service shutdown', async () => {
      const kafka = service.kafka

      await kafka.createProducerStream({
        streamOptions: { objectMode: false, topic: 'testBoo' },
      })

      await kafka.createConsumerStream({
        streamOptions: { topics: 'testBoo' },
        conf: { 'group.id': 'track-close-group' },
        topicConf: { 'auto.offset.reset': 'earliest' },
      })

      await service.close()

      assert.equal(kafka.getStreams().size, 0)
    })
  })

  await t.test('connected to broker', async (t) => {
    await t.test('consumer rebalance error', async () => {
      const topic = 'test-throw-on-rebalance'

      producer = await createProducerStream(service)
      await sendMessages(producer, topic, 100)
      await producer.closeAsync()

      consumerStream = await createConsumerStream(service, {
        streamOptions: {
          topics: topic,
        },
        conf: {
          'group.id': topic,
        },
      })

      sinon.stub(consumerStream.consumer, 'committedAsync').rejects(new Error('test rebalance error'))

      const receivedMessages: any[] = []
      const read = async () => {
        for await (const incomingMessage of consumerStream) {
          const messages = msgsToArr(incomingMessage)
          receivedMessages.push(...messages)
        }
      }

      await assert.rejects(read(), Error)
    })

    await t.test('on disconnected consumer with auto.commit', async () => {
      const topic = 'test-throw-disconnected-consumer'

      producer = await createProducerStream(service)
      await sendMessages(producer, topic, 100)
      await producer.closeAsync()

      consumerStream = await createConsumerStream(service, {
        streamOptions: {
          topics: topic,
        },
        conf: {
          'group.id': topic,
        },
      })

      const receivedMessages: any[] = []
      let disconnected = false

      for await (const incomingMessage of consumerStream) {
        const messages = msgsToArr(incomingMessage)
        receivedMessages.push(...messages)

        if (!disconnected && receivedMessages.length >= 1) {
          disconnected = true
          await consumerStream.consumer.disconnectAsync()
        }
      }

      assert.equal(receivedMessages.length, 20)
    })

    await t.test('on disconnected consumer without auto.commit', async (t) => {
      await t.test('as iterable', async () => {
        const topic = 'test-throw-disconnected-consumer-auto-commit'

        producer = await createProducerStream(service)
        await sendMessages(producer, topic, 100)
        await producer.closeAsync()

        consumerStream = await createConsumerStream(service, {
          streamOptions: {
            topics: topic,
          },
          conf: {
            'enable.auto.commit': false,
            'group.id': topic,
          },
        })

        const receivedMessages: any[] = []
        let disconnected = false
        const errorSim = async () => {
          for await (const incomingMessage of consumerStream) {
            const messages = msgsToArr(incomingMessage)
            receivedMessages.push(...messages)

            if (!disconnected && receivedMessages.length >= 1) {
              disconnected = true
              service.log.debug('DISCONNNECTING CONSUMER')
              consumerStream.consumer.disconnect()
            }
          }
        }

        await assert.rejects(errorSim(), UncommittedOffsetsError)
      })

      await t.test('as stream', async () => {
        const topic = 'test-throw-disconnected-consumer-auto-commit-stream'

        producer = await createProducerStream(service)
        await sendMessages(producer, topic, 10)
        await producer.closeAsync()

        consumerStream = await createConsumerStream(service, {
          streamOptions: {
            topics: topic,
          },
          conf: {
            'enable.auto.commit': false,
            'group.id': topic,
          },
        })

        let disconnected = false
        const receivedMessages: any[] = []

        const wStream = new Writable({
          objectMode: true,
          async write(chunk, _, callback) {
            const messages = msgsToArr(chunk)
            receivedMessages.push(...messages)

            if (!disconnected && receivedMessages.length >= 1) {
              disconnected = true
              service.log.debug('DISCONNNECTING CONSUMER')
              await consumerStream.consumer.disconnectAsync()
              callback()
            }

            callback()
          },
        })

        await assert.rejects(pipeline(consumerStream, wStream), UncommittedOffsetsError)
      })
    })

    await t.test('throws on offset.commit timeout on exit', async () => {
      const topic = 'test-throw-error-commit-timeout'

      producer = await createProducerStream(service)
      await sendMessages(producer, topic, 100)

      consumerStream = await createConsumerStream(service, {
        streamOptions: {
          topics: topic,
        },
        conf: {
          'enable.auto.commit': false,
          'group.id': topic,
        },
      })

      const receivedMessages: any[] = []
      let closed = false
      const errorSim = async () => {
        for await (const incomingMessage of consumerStream) {
          const messages = msgsToArr(incomingMessage)
          receivedMessages.push(...messages)

          if (!closed && receivedMessages.length === 20) {
            closed = true
            consumerStream.close()
          }
        }
      }

      await assert.rejects(errorSim(), UncommittedOffsetsError)
    })

    await t.test('throws on offset.commit error', async (t) => {
      await t.test('as iterable', async () => {
        const topic = 'test-throw-kafka-error-like'

        producer = await createProducerStream(service)
        await sendMessages(producer, topic, 40)

        consumerStream = await createConsumerStream(service, {
          streamOptions: {
            topics: topic,
          },
          conf: {
            'enable.auto.commit': false,
            'group.id': topic,
          },
        })

        const receivedMessages: any[] = []
        let errorEmitted = false
        const errorSim = async () => {
          for await (const incomingMessage of consumerStream) {
            const messages = msgsToArr(incomingMessage)
            receivedMessages.push(...messages)
            const lastMessage = messages[messages.length-1]

            if (!errorEmitted && receivedMessages.length === 20) {
              errorEmitted = true
              service.log.debug('EMIT ERROR')
              consumerStream.consumer.emit(
                'offset.commit',
                { code: 25, message: 'broker: unknown member' },
                [{ topic: lastMessage.topic, partition: lastMessage.partition, offset: lastMessage.offset + 1 }]
              )
            }
          }
        }

        await assert.rejects(errorSim(), OffsetCommitError)
      })

      await t.test('as stream', async () => {
        const topic = 'test-throw-kafka-error-like-stream'

        producer = await createProducerStream(service)
        await sendMessages(producer, topic, 40)

        consumerStream = await createConsumerStream(service, {
          streamOptions: {
            topics: topic,
          },
          conf: {
            'enable.auto.commit': false,
            'group.id': topic,
          },
        })

        const receivedMessages: any[] = []
        let errorEmitted = false

        const wStream = new Writable({
          objectMode: true,
          write(chunk, _, callback) {
            const messages = msgsToArr(chunk)
            receivedMessages.push(...messages)
            const lastMessage = messages[messages.length-1]

            if (!errorEmitted && receivedMessages.length === 20) {
              errorEmitted = true
              consumerStream.consumer.emit(
                'offset.commit',
                { code: 25, message: 'broker: unknown member' },
                [{ topic: lastMessage.topic, partition: lastMessage.partition, offset: lastMessage.offset + 1 }]
              )
            }
            callback()
          },
        })

        await assert.rejects(pipeline(consumerStream, wStream), OffsetCommitError)
      })
    })

    await t.test('executes external offset.commit error handler', async (t) => {
      const emitError = (stream: KafkaConsumerStream, topicPartition: { topic: string, partition: number, offset: number }) => {
        stream.consumer.emit(
          'offset.commit',
          { code: -168, message: 'Local: no offsets stored' },
          [ topicPartition ]
        )
      }

      t.test('as iterable', async () => {
        const topic = 'test-throw-kafka-error-handler'

        producer = await createProducerStream(service)
        await sendMessages(producer, topic, 100)

        consumerStream = await createConsumerStream(service, {
          streamOptions: {
            topics: topic,
          },
          conf: {
            'enable.auto.commit': false,
            'group.id': topic,
          },
        })

        const handlerStub = sinon.stub().returns(true)
        consumerStream.setOnCommitErrorHandler(handlerStub)

        const receivedMessages: any[] = []
        let errorEmitted = false
        const errorSim = async () => {
          for await (const incomingMessage of consumerStream) {
            const messages = msgsToArr(incomingMessage)
            receivedMessages.push(...messages)
            const lastMessage = messages[messages.length-1]

            if (!errorEmitted && receivedMessages.length === 20) {
              errorEmitted = true
              service.log.debug('EMIT ERROR')
              emitError(consumerStream, { topic: lastMessage.topic, partition: lastMessage.partition, offset: lastMessage.offset + 1 })
            } else {
              consumerStream.commit()
            }
          }
        }

        await assert.rejects(errorSim(), OffsetCommitError)
        assert.equal(handlerStub.calledOnce, true)
      })

      await t.test('as stream and ignores error if handler returned false', async () => {
        const topic = 'test-throw-kafka-error-handler-stream'

        producer = await createProducerStream(service)
        await sendMessages(producer, topic, 40)

        consumerStream = await createConsumerStream(service, {
          streamOptions: {
            topics: topic,
          },
          conf: {
            'enable.auto.commit': false,
            'group.id': topic,
          },
        })

        const handlerStub = sinon.stub().returns(false)
        consumerStream.setOnCommitErrorHandler(handlerStub)

        const receivedMessages: any[] = []
        let errorEmitted = false

        const wStream = new Writable({
          objectMode: true,
          write(chunk, _, callback) {
            const messages = msgsToArr(chunk)
            receivedMessages.push(...messages)
            const lastMessage = messages[messages.length-1]

            if (!errorEmitted && receivedMessages.length === 20) {
              errorEmitted = true
              emitError(consumerStream, { topic: lastMessage.topic, partition: lastMessage.partition, offset: lastMessage.offset + 1 })
            }
            consumerStream.commit()
            callback()
          },
        })

        await pipeline(consumerStream, wStream)
        assert.equal(handlerStub.calledOnce, true)
      })
    })

    await t.test('throws error 3 on incorrect topic commit', async () => {
      const topic = 'test-throw-error-invalid-topic'

      producer = await createProducerStream(service)
      await sendMessages(producer, topic, 40)

      consumerStream = await createConsumerStream(service, {
        streamOptions: {
          topics: topic,
        },
        conf: {
          'enable.auto.commit': false,
          'group.id': topic,
        },
      })

      const receivedMessages: any[] = []
      let sent = false
      const errorSim = async () => {
        for await (const incomingMessage of consumerStream) {
          const messages = msgsToArr(incomingMessage)
          const lastMessage = messages[messages.length-1]
          receivedMessages.push(...messages)

          if (!sent && receivedMessages.length === 20) {
            sent = true
            consumerStream.consumer.commitMessage({
              ...lastMessage,
              topic: 'fooobar',
            })

            const res = await once(consumerStream.consumer, 'offset.commit')
            service.log.debug(res, 'received commit')
          }
        }
      }

      await assert.rejects(errorSim(), Error)
    })

    await t.test('handles unsubscribe event from consumer', async (t) => {
      await t.test('as iterable', async () => {
        const topic = 'test-unsubscribe-event'

        producer = await createProducerStream(service)
        await sendMessages(producer, topic, 20)

        await producer.closeAsync()

        consumerStream = await createConsumerStream(service, {
          streamOptions: {
            topics: topic,
            streamAsBatch: true,
            fetchSize: 5,
            waitInterval: 100,
          },
          conf: {
            'enable.auto.commit': false,
            'group.id': topic,
          },
        })
        const { consumer } = consumerStream

        const receivedMessages: any[] = []
        let unsubscribeCalled = false

        for await (const incomingMessage of consumerStream) {
          const messages = msgsToArr(incomingMessage)
          receivedMessages.push(...messages)
          await consumerStream.commitMessages(messages)

          if (!unsubscribeCalled && receivedMessages.length > 2) {
            unsubscribeCalled = true
            // unsubscribe consumer
            consumer.unsubscribe()
          }
        }
        // we should receive only 1 pack of messages from first topic
        assert.equal(receivedMessages.length, 5)
        service.log.debug('>>>>>>>>>>>>>>>> end ')
      })

      await t.test('as stream', async () => {
        const topic = 'test-unsubscribe-event-stream'

        producer = await createProducerStream(service)
        await sendMessages(producer, topic, 20)
        await producer.closeAsync()

        consumerStream = await createConsumerStream(service, {
          streamOptions: {
            topics: topic,
            streamAsBatch: true,
            fetchSize: 5,
          },
          conf: {
            'enable.auto.commit': false,
            'group.id': topic,
          },
        })

        const { consumer } = consumerStream

        const receivedMessages: any[] = []
        let unsubscribeCalled = false
        const wStream = new Writable({
          objectMode: true,
          async write(chunk, _, callback) {
            const messages = msgsToArr(chunk)
            receivedMessages.push(...messages)
            await consumerStream.commitMessages(messages)

            if (!unsubscribeCalled && receivedMessages.length > 2) {
              unsubscribeCalled = true
              // unsubscribe consumer
              consumer.unsubscribe()
            }

            callback()
          },
        })

        await pipeline(consumerStream, wStream)

        // we should receive only 1 pack of messages from first topic
        assert.equal(receivedMessages.length, 5)
      })
    })

    await t.test('with disabled auto.commit and disabled auto.offset.store', async (t) => {
      await t.test('as iterable', async () => {
        const topic = 'test-no-auto-commit-manual-offset-store'

        producer = await createProducerStream(service)
        const sentMessages = await sendMessages(producer, topic, 10)

        consumerStream = await createConsumerStream(service, {
          streamOptions: {
            topics: topic,
          },
          conf: {
            'enable.auto.commit': false,
            'enable.auto.offset.store': false,
            'group.id': topic,
          },
        })

        const receivedMessages: any[] = []
        for await (const incomingMessage of consumerStream) {
          const messages = msgsToArr(incomingMessage)
          receivedMessages.push(...messages)

          for (const message of messages) {
            service.log.debug({ message }, 'RECV')
            consumerStream.consumer.offsetsStore([{
              topic: message.topic,
              partition: message.partition,
              offset: message.offset + 1,
            }])
          }

          consumerStream.commit()
        }

        assert.equal(receivedMessages.length, sentMessages.length)
      })

      await t.test('as stream', async () => {
        const topic = 'test-no-auto-commit-manual-offset-store-stream'

        producer = await createProducerStream(service)
        const sentMessages = await sendMessages(producer, topic, 10)

        consumerStream = await createConsumerStream(service, {
          streamOptions: {
            topics: topic,
          },
          conf: {
            'enable.auto.commit': false,
            'enable.auto.offset.store': false,
            'group.id': topic,
          },
        })

        const receivedMessages: any[] = []

        const transformStream = new Writable({
          objectMode: true,
          write(chunk, _, callback) {
            const messages = msgsToArr(chunk)
            receivedMessages.push(...messages)
            for (const message of messages) {
              service.log.debug({ message }, 'RECV')
              consumerStream.consumer.offsetsStore([{
                topic: message.topic,
                partition: message.partition,
                offset: message.offset + 1,
              }])
            }
            consumerStream.commit()
            callback()
          },
        })

        await pipeline(consumerStream, transformStream)

        assert.equal(receivedMessages.length, sentMessages.length)
      })
    })

    await t.test('with disabled auto.commit and using manual `commit` in batchMode', async () => {
      const topic = 'test-no-auto-commit-batch'

      producer = await createProducerStream(service)
      const sentMessages = await sendMessages(producer, topic, 10)

      consumerStream = await createConsumerStream(service, {
        streamOptions: {
          topics: topic,
        },
        conf: {
          'enable.auto.commit': false,
          'group.id': topic,
        },
      })

      const receivedMessages = await readStream(consumerStream)
      assert.equal(receivedMessages.length, sentMessages.length)
    })

    await t.test('with disabled auto.commit and using manual `commit`', async () => {
      const topic = 'test-no-auto-commit'

      producer = await createProducerStream(service)
      const sentMessages = await sendMessages(producer, topic, 10)

      consumerStream = await createConsumerStream(service, {
        streamOptions: {
          fetchSize: 5,
          streamAsBatch: false,
          topics: topic,
        },
        conf: {
          'enable.auto.commit': false,
          'group.id': topic,
        },
      })

      const receivedMessages = await readStream(consumerStream)
      assert.equal(receivedMessages.length, sentMessages.length)
    })

    // Stream should process all buferred messages and exit
    await t.test('with disabled auto.commit and using manual `commit` on `close` called', async (t) => {
      await t.test('as iterable', async () => {
        const topic = 'test-no-auto-commit-close'
        producer = await createProducerStream(service)
        await sendMessages(producer, topic, 40)

        consumerStream = await createConsumerStream(service, {
          streamOptions: {
            topics: topic,
            streamAsBatch: false,
            fetchSize: 5,
          },
          conf: {
            'enable.auto.commit': false,
            'group.id': topic,
          },
        })

        const receivedMessages: any[] = []
        let closeCalled = false

        for await (const incomingMessage of consumerStream) {
          const messages = msgsToArr(incomingMessage)
          receivedMessages.push(...messages)
          const positions = await consumerStream.commitMessages(messages)
          service.log.info({ positions }, 'commitAsync')

          if (!closeCalled && receivedMessages.length === 5) {
            closeCalled = true
            await consumerStream.closeAsync()
          }
        }
        // we should receive only first pack of messages
        assert.equal(receivedMessages.length, 5)
      })

      await t.test('as stream', async () => {
        const topic = 'test-no-auto-commit-close-stream'
        producer = await createProducerStream(service)
        await sendMessages(producer, topic, 10)
        await producer.closeAsync()

        consumerStream = await createConsumerStream(service, {
          streamOptions: {
            topics: topic,
            streamAsBatch: false,
            fetchSize: 5,
          },
          conf: {
            'enable.auto.commit': false,
            'group.id': topic,
          },
        })

        let closeCalled = false
        const receivedMessages: any[] = []

        const transformStream = new Writable({
          objectMode: true,
          async write(chunk, _, callback) {
            const messages = msgsToArr(chunk)
            receivedMessages.push(...messages)
            await consumerStream.commitMessages(messages)

            if (!closeCalled && receivedMessages.length === 5) {
              closeCalled = true
              consumerStream.close(() => {
                service.log.debug('closed connection')
                callback()
              })
            } else {
              callback()
            }
          },
        })

        await pipeline(consumerStream, transformStream)

        // we should receive only first pack of messages
        assert.equal(receivedMessages.length, 5)
      })
    })

    await t.test('should exit when topic is empty', async (t) => {
      await t.test('as iterable', async () => {
        const topic = 'test-empty-topic'

        consumerStream = await createConsumerStream(service, {
          streamOptions: {
            checkTopicExists: false,
            topics: topic,
            streamAsBatch: false,
            fetchSize: 5,
          },
          conf: {
            'enable.auto.commit': false,
            'group.id': topic,
            'allow.auto.create.topics': true, // doesnt work
          },
        })

        const receivedMessages = await readStream(consumerStream)
        assert.equal(receivedMessages.length, 0)
      })

      await t.test('as stream', async () => {
        const topic = 'test-empty-topic-stream'

        consumerStream = await createConsumerStream(service, {
          streamOptions: {
            checkTopicExists: false,
            topics: topic,
            streamAsBatch: false,
            fetchSize: 5,
          },
          conf: {
            'enable.auto.commit': false,
            'group.id': topic,
            'allow.auto.create.topics': true,
          },
        })

        const receivedMessages: any[] = []

        const transformStream = new Writable({
          objectMode: true,
          write(chunk, _, callback) {
            const messages = msgsToArr(chunk)
            receivedMessages.push(...messages)
            const message = messages[messages.length-1]
            consumerStream.consumer.commitMessage(message)
            callback()
          },
        })

        await pipeline(consumerStream, transformStream)
        assert.equal(receivedMessages.length, 0)
      })
    })

    await t.test('with disabled auto.commit and using manual `commit` in batchMode on `close` called', async () => {
      const topic = 'test-no-auto-commit-unsubscribe-batch'

      producer = await createProducerStream(service)

      await sendMessages(producer, topic, 20)

      consumerStream = await createConsumerStream(service, {
        streamOptions: {
          topics: topic,
          streamAsBatch: true,
          fetchSize: 5,
        },
        conf: {
          'enable.auto.commit': false,
          'group.id': topic,
        },
      })

      const receivedMessages: any[] = []
      let closeCalled = false

      for await (const incomingMessage of consumerStream) {
        const messages = msgsToArr(incomingMessage)
        receivedMessages.push(...messages)

        await consumerStream.commitMessages(messages)

        if (!closeCalled && receivedMessages.length === 5) {
          closeCalled = true
          consumerStream.close(() => {
            service.log.debug('closed connection')
          })
        }
      }
      // we should receive only 1 pack of messages
      assert.equal(receivedMessages.length, 5)
    })

    await t.test('with auto.commit enabled', async () => {
      const topic = 'test-auto-commit'

      producer = await createProducerStream(service)
      const sentMessages = await sendMessages(producer, topic, 10)

      consumerStream = await createConsumerStream(service, {
        streamOptions: {
          topics: topic,
        },
        conf: {
          'enable.auto.commit': true,
          'group.id': topic,
        },
      })

      const receivedMessages = await readStream(consumerStream, false)
      assert.equal(receivedMessages.length, sentMessages.length)
    })

    // await t.test('with auto.commit enabled RegExp subscribe', async () => {
    //   const topic = 'test-regexp-topic-1'

    //   producer = await createProducerStream(service)
    //   const sentMessages = await sendMessages(producer, topic, 13)

    //   consumerStream = await createConsumerStream(service, {
    //     streamOptions: {
    //       topics: [
    //         /^test-regexp-.*$/,
    //         /^test-reg2-.*$/,
    //       ]
    //     },
    //     conf: {
    //       'enable.auto.commit': false,
    //       'group.id': topic,
    //       // 'allow.auto.create.topics': true,
    //     },
    //   })

    //   const receivedMessages = await readStream(consumerStream)
    //   assert.equal(
    //     receivedMessages.length,
    //     sentMessages.length,
    //     stringify({ sentMessages, receivedMessages })
    //   )
    // })

    await t.test('with auto.commit enabled and manual `offsetsStore`', async () => {
      const topic = 'test-auto-commit-manual-offset-store'

      producer = await createProducerStream(service)
      const sentMessages = await sendMessages(producer, topic, 10)

      service.log.debug('produced messages')

      consumerStream = await createConsumerStream(service, {
        streamOptions: {
          topics: topic,
        },
        conf: {
          'enable.auto.commit': true,
          'enable.auto.offset.store': false,
          'group.id': topic,
        },
      })

      const receivedMessages: any[] = []
      for await (const incomingMessage of consumerStream) {
        const messages = msgsToArr(incomingMessage)
        receivedMessages.push(...messages)

        for (const { partition, offset } of messages) {
          // https://github.com/edenhill/librdkafka/blob/b1b511dd1116788b301d0487594263b686c56c59/src/rdkafka_op.c#L747
          // we need to store latest message offset + 1
          consumerStream.consumer.offsetsStore([{
            topic,
            partition,
            offset: offset + 1,
          }])
        }
      }

      assert.equal(receivedMessages.length, sentMessages.length)

      service.log.debug('opening another consumer stream')

      consumerStream = await createConsumerStream(service, {
        streamOptions: {
          topics: topic,
        },
        conf: {
          'enable.auto.commit': true,
          'group.id': topic,
        },
      })

      service.log.debug('waiting for stream messages')

      const newMessages = await readStream(consumerStream, false)
      assert.equal(newMessages.length, 0)
    })
  })
})

test('#2s-toxified', async (t) => {
  let service: Microfleet
  let producer: KafkaProducerStream
  let consumerStream: KafkaConsumerStream

  t.beforeEach(async () => {
    service = new Microfleet({
      name: 'tester',
      plugins: ['logger', 'validator', 'kafka'],
      kafka: {
        'metadata.broker.list': 'kafka:39092',
        'group.id': 'test-group',
        'fetch.wait.max.ms': 50,
      },
    })
    await service.register()
  })

  const setProxyEnabled = async (enabled: boolean) => {
    const proxy = await toxiproxy.get('kafka-proxy-2s')
    await proxy.update({ enabled })
  }

  t.afterEach(async () => {
    await setProxyEnabled(true)
    await service.close()
  })

  await t.test('no-auto-commit commitSync', async (t) => {
    await t.test('as stream', async () => {
      const topic = `toxified-test-no-auto-commit-no-batch-eof-stream-${Date.now()}`
      producer = await createProducerStream(service)

      const receivedMessages: any[] = []

      await sendMessages(producer, topic, 10)
      await producer.closeAsync()

      consumerStream = await createConsumerStream(service, {
        streamOptions: {
          topics: topic,
          streamAsBatch: false,
        },
        conf: {
          'group.id': topic,
          'enable.auto.commit': false,
        },
      })

      let blockedOnce = false

      consumerStream.setOnCommitErrorHandler(() => false)

      const transformStream = new Writable({
        objectMode: true,
        async write(chunk, _, callback) {
          const messages = msgsToArr(chunk)
          receivedMessages.push(...messages)

          if (!blockedOnce) {
            await setProxyEnabled(false)
            setTimeout(2000).then(async () => {
              await setProxyEnabled(true)
              service.emit('proxy-enabled')
            })
            blockedOnce = true
          }

          try {
            await consumerStream.commitMessages(messages)
            callback()
          } catch (e: any) {
            callback(e)
          }
        }
      })

      await pipeline(consumerStream, transformStream)
      await consumerStream.closeAsync()
      assert.equal(receivedMessages.length, 10)
    })

    await t.test('as iterable', async () => {
      const topic = `toxified-test-no-auto-commit-no-batch-eof-${Date.now()}`
      producer = await createProducerStream(service)

      const receivedMessages: any[] = []

      await sendMessages(producer, topic, 10)

      consumerStream = await createConsumerStream(service, {
        streamOptions: {
          topics: topic,
          streamAsBatch: false,
        },
        conf: {
          'group.id': topic,
          'enable.auto.commit': false,
        },
      })

      let blockedOnce = false

      for await (const incomingMessage of consumerStream) {
        const messages = msgsToArr(incomingMessage)
        receivedMessages.push(...messages)
        if (!blockedOnce) {
          await setProxyEnabled(false)
          setTimeout(2000).then(async () => {
            await setProxyEnabled(true)
            service.emit('proxy-enabled')
          })
          blockedOnce = true
        }

        try {
          await consumerStream.commitMessages(messages)
        } catch (e: any) {
          service.log.debug({ err: e }, 'commit sync error')
          throw e
        }
      }

      assert.equal(receivedMessages.length, 10)
    })
  })

  // shows successfull commit recovery
  // sometimes kafka still not connected to the broker
  // test will pass in this condition
  await t.test('block after first commit no-auto-commit', async () => {
    const topic = 'async-toxified-test-no-auto-commit-no-batch-eof'
    producer = await createProducerStream(service)

    const receivedMessages: any[] = []

    await sendMessages(producer, topic, 4)
    await producer.closeAsync()

    consumerStream = await createConsumerStream(service, {
      streamOptions: {
        topics: topic,
        fetchSize: 2,
      },
      conf: {
        'group.id': topic,
        'enable.auto.commit': false,
      },
    })

    let blockedOnce = false

    const simOne = async () => {
      for await (const incoming of consumerStream) {
        const batch = msgsToArr(incoming)
        commitBatch(consumerStream, batch)
        receivedMessages.push(...batch)

        if (!blockedOnce) {
          await once(consumerStream.consumer, 'offset.commit')

          service.log.debug('BLOCKING connection')
          blockedOnce = true
          await setProxyEnabled(false)
          setTimeout(2000)
            .then(async () => {
              await setProxyEnabled(true)
              service.log.debug('ENABLED connection')
          })
        }
      }
    }

    try {
      await simOne()
      await consumerStream.closeAsync()
    } catch (e: any) {
      if (e.code === RdKafkaCodes.ERRORS.ERR__TRANSPORT) {
        service.log.warn('TEST INCONSISTENT - RDKAFKA did not connected. But its OK')
        return
      }
      throw(e)
    } finally {
      await setProxyEnabled(true)
    }

    service.log.debug('start the second read sequence')

    consumerStream = await createConsumerStream(service, {
      streamOptions: {
        topics: topic,
      },
      conf: {
        'group.id': topic,
        'enable.auto.commit': false,
      },
    })

    const newMessages = await readStream(consumerStream)
    assert.equal(newMessages.length, 0)
  })
})

test('#consumer parallel reads', async (t) => {
  let service: Microfleet

  t.beforeEach(async () => {
    service = new Microfleet({
      name: 'tester',
      plugins: ['logger', 'validator', 'kafka'],
      kafka: {
        'metadata.broker.list': 'kafka:49092',
        'group.id': 'test-group',
        // debug: 'consumer',
      },
    })

    await service.register()
  })

  t.afterEach(async () => {
    await service.close()
  })

  const createConsumer = async (topic: string, meta = { name: 'testConsumer' }): Promise<KafkaConsumerStream> => {
    return createConsumerStream(service, {
      meta,
      streamOptions: {
        topics: topic,
        fetchSize: 1,
      },
      conf: {
        'group.id': topic,
        'enable.auto.commit': false,
      },
    })
  }

  const consumeMessages = async (stream: KafkaConsumerStream, onIter?: () => Promise<void>): Promise<Message[]> => {
    const messages: Message[] = []
    for await (const message of stream) {
      messages.push(...msgsToArr(message))
      commitBatch(stream, message)
      if (onIter) await onIter()
    }
    return messages
  }

  await t.test('processes messages in parallel', async () => {
    const topic = `parallel-read-${Date.now()}`

    const producer = await createProducerStream(service)
    await sendMessages(producer, topic, 33)

    const [consumer1, consumer2] = await Promise.all([
      createConsumer(topic, { name: 'AAAA' }),
      createConsumer(topic, { name: 'BBBB' })
    ])

    const result = await Promise.all([
      consumeMessages(consumer1),
      consumeMessages(consumer2),
    ])

    assert.equal([...result[0], ...result[1]].length, 33)
    await Promise.all([consumer1.closeAsync(), consumer2.closeAsync()])
  })

  await t.test('additional consumer connects after processing started', async () => {
    const topic = `parallel-read-consumer-connect-after-${Date.now()}`
    const emitter = new EventEmitter()

    const producer = await createProducerStream(service)
    await sendMessages(producer, topic, 22)

    const consumers: { [key: string]: KafkaConsumerStream } = Object.create(null)

    consumers['consumer1'] = await createConsumer(topic, { name: 'ZZZZ' })

    const firstRead = consumeMessages(consumers.consumer1, async () => {
      if (!consumers.consumer2) {
        await once(consumers.consumer1.consumer, 'offset.commit')
        consumers.consumer2 = await createConsumer(topic, { name: 'YYYY' })
        emitter.emit('start-second')
      }
    })

    const secondRead = async () => {
      await once(emitter, 'start-second')
      return consumeMessages(consumers.consumer2)
    }

    const result = await Promise.all([
      firstRead, secondRead()
    ])

    assert.equal([...result[0], ...result[1]].length, 22)
    await consumers.consumer1.closeAsync()

    assert.ok(consumers.consumer2)
    await consumers.consumer2.closeAsync()
  })
})

test.skip('#8s-toxified', async (t) => {
  let service: Microfleet
  let producer: KafkaProducerStream
  let consumerStream: KafkaConsumerStream

  t.beforeEach(async () => {
    service = new Microfleet({
      name: 'tester',
      plugins: ['logger', 'validator', 'kafka'],
      kafka: {
        'metadata.broker.list': 'kafka:29092',
        'group.id': 'test-group',
        'fetch.wait.max.ms': 50,
      },
    })

    await service.register()
  })

  t.afterEach(async () => {
    await service.close()
  })

  const setProxyEnabled = async (enabled: boolean) => {
    const proxy = await toxiproxy.get('kafka-proxy')
    await proxy.update({ enabled })
  }

  // if Kafka Erro 25 appears, consumer starts fetching messages from the beginning
  // test is unstable and it's hard to reproduce this error
  // Skipped
  test.skip('`unknown memberid error` on second commit after first commit no-auto-commit', async () => {
    const topic = 'first-commit-long-toxified-test-no-auto-commit-no-batch-eof'
    producer = await createProducerStream(service)

    const receivedMessages: any[] = []

    await sendMessages(producer, topic, 10)
    await producer.closeAsync()

    consumerStream = await createConsumerStream(service, {
      streamOptions: {
        topics: topic,
        fetchSize: 2,
      },
      conf: {
        debug: 'consumer,cgrp',
        'group.id': topic,
        'enable.auto.commit': false,
      },
    })

    let blockedOnce = false
    const simOne = async () => {
      for await (const incomingMessage of consumerStream) {
        const messages = msgsToArr(incomingMessage)
        receivedMessages.push(...messages)
        const lastMessage = messages[messages.length-1]

        if (!blockedOnce && receivedMessages.length == 4) {
          service.log.debug('BLOCKING connection')
          blockedOnce = true
          await setProxyEnabled(false)
          setTimeout(9000)
            .then(async () => {
              await setProxyEnabled(true)
              service.log.debug('ENABLED connection')
            })
        }
        consumerStream.consumer.commitMessage(lastMessage)
        await once(consumerStream.consumer, 'offset.commit')
      }
    }

    await assert.rejects(simOne(), OffsetCommitError)
    assert.equal(receivedMessages.length, 4)

    consumerStream = await createConsumerStream(service, {
      streamOptions: {
        topics: topic,
      },
      conf: {
        'group.id': topic,
        'enable.auto.commit': false,
      },
    })

    const newMessages = await readStream(consumerStream)

    assert.equal(newMessages.length, 8)
  })
})

test('#connect-toxified', async (t) => {
  let service: Microfleet

  t.beforeEach(async () => {
    service = new Microfleet({
      name: 'tester',
      plugins: ['logger', 'validator', 'kafka'],
      kafka: {
        'metadata.broker.list': 'toxy:49092',
        'group.id': 'test-group',
        'fetch.wait.max.ms': 50,
        debug: 'consumer',
      },
    })

    await service.register()
  })

  t.afterEach(async () => {
    await service.close()
  })

  const setProxyEnabled = async (enabled: boolean) => {
    const proxy = await toxiproxy.get('kafka-proxy-small-timeout')
    await proxy.update({ enabled })
  }

  t.beforeEach(async () => {
    await setProxyEnabled(false)
  })

  t.afterEach(async () => {
    await setProxyEnabled(true)
  })

  await t.test('producer connection timeout', async () => {
    const { kafka } = service
    const createPromise = kafka.createProducerStream({
      streamOptions: { objectMode: false, topic: 'testBoo', connectOptions: { timeout: 200 } },
      conf: { 'client.id': 'consume-group-offline' },
    })
    await assert.rejects(createPromise, Error)
  })

  await t.test('consumer connection timeout', async () => {
    const { kafka } = service
    const createPromise = kafka.createConsumerStream({
      streamOptions: {
        topics: ['test'],
        connectOptions: { timeout: 200 },
      },
      conf: { 'client.id': 'consume-group-offline' },
    })
    await assert.rejects(createPromise, Error)
  })
})
