import { Microfleet } from '@microfleet/core'
import { once, EventEmitter } from 'events'
import { Transform, pipeline as origPipeline } from 'readable-stream'
import * as util from 'util'
import { Toxiproxy } from 'toxiproxy-node-client'
import { delay, TimeoutError } from 'bluebird'
import * as sinon from 'sinon'

const pipeline = util.promisify(origPipeline)

import {
  KafkaConsumerStream,
  KafkaProducerStream,
  TopicNotFoundError,
  OffsetCommitError,
  UncommittedOffsetsError,
  LibrdKafkaErrorClass,
  Message,
  RdKafkaCodes,
} from '@microfleet/plugin-kafka'

import { createProducerStream, createConsumerStream, sendMessages, msgsToArr, readStream, commitBatch } from '../helpers/kafka'

const toxiproxy = new Toxiproxy('http://toxy:8474')

describe('#generic', () => {
  let service: Microfleet
  let producer: KafkaProducerStream
  let consumerStream: KafkaConsumerStream

  beforeEach(() => {
    service = new Microfleet({
      name: 'tester',
      plugins: ['logger', 'validator', 'kafka'],
      kafka: {
        // debug: 'all',
        'metadata.broker.list': 'kafka:9092,',
        'group.id': 'test-group',
        'fetch.wait.max.ms': 300,
      },
    })
  })

  afterEach(async () => {
    await service.close()
  })

  describe('connect', () => {
    test('should be able to create a producer stream', async () => {
      const { kafka } = service
      producer = await kafka.createProducerStream({
        streamOptions: { objectMode: false, topic: 'testBoo' },
      })

      expect(producer).toBeDefined()
    })

    test('should be able to create a consumer stream', async () => {
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

      // if you need performance please avoid use cases like this
      producer.write('some')
      await once(producer.producer, 'delivery-report')

      consumerStream = await kafka.createConsumerStream({
        streamOptions: { topics: ['testBoo'] },
      })

      expect(consumerStream).toBeDefined()
    })

    test('should be able to get Admin client and create/delete topic', async () => {
      const { kafka } = service
      const readyTopic = {name: 'manually-created', partitions: [{id: 0, isrs: [1], leader: 1, replicas: [1]}]}
      const topic = 'manually-created'

      const producerTemp = await kafka.createProducerStream({
        streamOptions: { objectMode: true },
      })

      const { admin } = kafka

      await admin.createTopic({ topic: { topic, num_partitions: 1, replication_factor: 1 }})
      const meta = await producerTemp.producer.getMetadataAsync({ allTopics: true })
      expect(meta.topics).toEqual(
        expect.arrayContaining([
          expect.objectContaining(readyTopic)
        ])
      )

      await admin.deleteTopic({ topic })
      const metaAfter = await producerTemp.producer.getMetadataAsync({ topic })
      expect(metaAfter.topics).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining(readyTopic)
        ])
      )
    })

    test('should be able to get Admin client and create/delete topic and reuse passed client', async () => {
      const { kafka } = service
      const readyTopic = {name: 'manually-created-2', partitions: [{id: 0, isrs: [1], leader: 1, replicas: [1]}]}
      const topic = 'manually-created-2'

      const producerTemp = await kafka.createProducerStream({
        streamOptions: { objectMode: true },
      })

      const { admin } = kafka

      await admin.createTopic({
        client: producerTemp.producer,
        topic: { topic, num_partitions: 1, replication_factor: 1 },
        params: {
          max_tries: 20,
          interval: 1000,
          timeout: 20000,
        }
      })
      const meta = await producerTemp.producer.getMetadataAsync({ allTopics: true })
      expect(meta.topics).toEqual(
        expect.arrayContaining([
          expect.objectContaining(readyTopic)
        ])
      )

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
      expect(metaAfter.topics).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining(readyTopic)
        ])
      )
    })

    describe('consumer missing topic', () => {
      test('with allTopics: true', async () => {
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

        await expect(req).rejects.toThrowError(TopicNotFoundError)
      })

      test('with topic: value', async () => {
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

        await expect(req).rejects.toThrowError(TopicNotFoundError)
      })

      test('without checkTopic - will create topic and exit at eof', async () => {
        const topic = 'test-not-found-no-auto-created'

        consumerStream = await createConsumerStream(service, {
          streamOptions: {
            topics: topic,
          },
          conf: {
            'group.id': topic,
          },
        })

        const receivedMessages = await readStream(consumerStream)

        expect(receivedMessages).toHaveLength(0)
      })

      test('topic as RegExp', async () => {
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

        await expect(req).rejects.toThrowError(TopicNotFoundError)
      })

    })
  })

  describe('conn-track', () => {
    test('tracks streams', async () => {
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

      // required to create the topic as it might not exist
      streamToClose.write('create me please')
      await once(streamToClose.producer, 'delivery-report')

      const streamToCloseToo = await kafka.createConsumerStream({
        streamOptions: { topics: 'testBoo' },
        conf: { 'group.id': 'track-group' },
        topicConf: { 'auto.offset.reset': 'earliest' },
      })

      expect(kafka.getStreams().size).toEqual(2)

      await streamToClose.closeAsync()
      expect(kafka.getStreams().size).toEqual(1)

      await streamToCloseToo.closeAsync()
      expect(kafka.getStreams().size).toEqual(0)
    })

    test('closes streams on service shutdown', async () => {
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

      expect(kafka.getStreams().size).toEqual(0)
    })
  })

  describe('connected to broker', () => {
    test('on disconnected consumer with auto.commit', async () => {
      const topic = 'test-throw-disconnected-consumer'

      producer = await createProducerStream(service)
      await sendMessages(producer, topic, 10)
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

      for await (const incommingMessage of consumerStream) {
        const messages = msgsToArr(incommingMessage)
        receivedMessages.push(...messages)

        if (!disconnected && receivedMessages.length >= 1) {
          disconnected = true
          await consumerStream.consumer.disconnectAsync()
        }
      }

      expect(receivedMessages).toHaveLength(2)
    })

    describe('on disconnected consumer without auto.commit', () => {
      test('as iterable', async () => {
        const topic = 'test-throw-disconnected-consumer-auto-commit'

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

        const receivedMessages: any[] = []
        let disconnected = false
        const errorSim = async () => {
          for await (const incommingMessage of consumerStream) {
            const messages = msgsToArr(incommingMessage)
            receivedMessages.push(...messages)

            if (!disconnected && receivedMessages.length >= 1) {
              disconnected = true
              service.log.debug('DISCONNNECTING CONSUMER')
              consumerStream.consumer.disconnect()
            }
          }
        }

        await expect(errorSim()).rejects.toThrowError(UncommittedOffsetsError)
      })

      test('as stream', async () => {
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

        const transformStream = new Transform({
          objectMode: true,
          async transform(chunk, _, callback) {
            const messages = msgsToArr(chunk)
            receivedMessages.push(...messages)

            if (!disconnected && receivedMessages.length >= 1) {
              disconnected = true
              service.log.debug('DISCONNNECTING CONSUMER')
              consumerStream.consumer.disconnect()
              callback()
            }
          },
        })

        await expect(pipeline(consumerStream, transformStream)).rejects.toThrowError(UncommittedOffsetsError)
      })
    })

    test('throws on offset.commit timeout on exit', async () => {
      const topic = 'test-throw-error-commit-timeout'

      producer = await createProducerStream(service)
      await sendMessages(producer, topic, 10)

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
        for await (const incommingMessage of consumerStream) {
          const messages = msgsToArr(incommingMessage)
          receivedMessages.push(...messages)

          if (!closed && receivedMessages.length === 2) {
            closed = true
            consumerStream.close()
          }
        }
      }

      await expect(errorSim()).rejects.toThrowError(TimeoutError)
    })

    describe('throws on offset.commit error', () => {
      test('as iterable', async () => {
        const topic = 'test-throw-kafka-error-like'

        producer = await createProducerStream(service)
        await sendMessages(producer, topic, 10)

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
          for await (const incommingMessage of consumerStream) {
            const messages = msgsToArr(incommingMessage)
            receivedMessages.push(...messages)
            const lastMessage = messages[messages.length-1]

            if (!errorEmitted && receivedMessages.length === 2) {
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

        await expect(errorSim()).rejects.toThrowError(OffsetCommitError)
      })

      test('as stream', async () => {
        const topic = 'test-throw-kafka-error-like-stream'

        producer = await createProducerStream(service)
        await sendMessages(producer, topic, 10)

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

        const transformStream = new Transform({
          objectMode: true,
          transform(chunk, _, callback) {
            const messages = msgsToArr(chunk)
            receivedMessages.push(...messages)
            const lastMessage = messages[messages.length-1]

            if (!errorEmitted && receivedMessages.length === 2) {
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

        await expect(pipeline(consumerStream, transformStream)).rejects.toThrowError(OffsetCommitError)
      })
    })

    describe('executes external offset.commit error handler', () => {
      test('as iterable', async () => {
        const topic = 'test-throw-kafka-error-handler'

        producer = await createProducerStream(service)
        await sendMessages(producer, topic, 10)

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
          for await (const incommingMessage of consumerStream) {
            const messages = msgsToArr(incommingMessage)
            receivedMessages.push(...messages)
            const lastMessage = messages[messages.length-1]

            if (!errorEmitted && receivedMessages.length === 2) {
              errorEmitted = true
              service.log.debug('EMIT ERROR')
              consumerStream.consumer.emit(
                'offset.commit',
                { code: -168, message: 'Local: no offsets stored' },
                [{ topic: lastMessage.topic, partition: lastMessage.partition, offset: lastMessage.offset + 1 }]
              )
            }
            consumerStream.commit()
          }
        }

        await expect(errorSim()).rejects.toThrowError(OffsetCommitError)
        expect(handlerStub.calledOnce).toEqual(true)
      })

      test('as stream and ignores error if handler returned false', async () => {
        const topic = 'test-throw-kafka-error-handler-stream'

        producer = await createProducerStream(service)
        await sendMessages(producer, topic, 10)

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

        const transformStream = new Transform({
          objectMode: true,
          transform(chunk, _, callback) {
            const messages = msgsToArr(chunk)
            receivedMessages.push(...messages)
            const lastMessage = messages[messages.length-1]

            if (!errorEmitted && receivedMessages.length === 2) {
              errorEmitted = true
              consumerStream.consumer.emit(
                'offset.commit',
                { code: -168, message: 'Local: no offsets stored' },
                [{ topic: lastMessage.topic, partition: lastMessage.partition, offset: lastMessage.offset + 1 }]
              )
            }
            consumerStream.commit()
            callback()
          },
        })

        await pipeline(consumerStream, transformStream)
        expect(handlerStub.calledOnce).toEqual(true)
      })
    })

    test('throws error 3 on incorrect topic commit', async () => {
      const topic = 'test-throw-error-invalid-topic'

      producer = await createProducerStream(service)
      await sendMessages(producer, topic, 10)

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
        for await (const incommingMessage of consumerStream) {
          const messages = msgsToArr(incommingMessage)
          const lastMessage = messages[messages.length-1]
          receivedMessages.push(...messages)

          if (!sent && receivedMessages.length === 2) {
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

      await expect(errorSim()).rejects.toThrowError('Kafka critical error: Broker: Unknown topic or partitio')
    })

    describe('handles unsubscribe event from consumer', () => {
      test('as iterable', async () => {
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

        for await (const incommingMessage of consumerStream) {
          const messages = msgsToArr(incommingMessage)
          receivedMessages.push(...messages)

          if (!unsubscribeCalled && receivedMessages.length > 2) {
            unsubscribeCalled = true
            // unsubscribe consumer
            consumer.unsubscribe()
          }
          commitBatch(consumerStream, messages)
        }
        // we should receive only 1 pack of messages from first topic
        expect(receivedMessages).toHaveLength(5)
        service.log.debug('>>>>>>>>>>>>>>>> end ')
      })

      test('as stream', async () => {
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
        const transformStream = new Transform({
          objectMode: true,
          transform(chunk, _, callback) {
            const messages = msgsToArr(chunk)
            receivedMessages.push(...messages)

            if (!unsubscribeCalled && receivedMessages.length > 2) {
              unsubscribeCalled = true
              // unsubscribe consumer
              consumer.unsubscribe()
            }
            commitBatch(consumerStream, messages)
            callback()
          },
        })

        await pipeline(consumerStream, transformStream)

        // we should receive only 1 pack of messages from first topic
        expect(receivedMessages).toHaveLength(5)
      })
    })

    describe('with disabled auto.commit and disabled auto.offset.store', () => {
      test('as iterable', async () => {
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
        for await (const incommingMessage of consumerStream) {
          const messages = msgsToArr(incommingMessage)
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

        expect(receivedMessages).toHaveLength(sentMessages.length)
      })

      test('as stream', async () => {
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

        const transformStream = new Transform({
          objectMode: true,
          transform(chunk, _, callback) {
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

        expect(receivedMessages).toHaveLength(sentMessages.length)
      })
    })

    test('with disabled auto.commit and using manual `commit` in batchMode', async () => {
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
      expect(receivedMessages).toHaveLength(sentMessages.length)
    })

    test('with disabled auto.commit and using manual `commit`', async () => {
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
      expect(receivedMessages).toHaveLength(sentMessages.length)
    })

    // Stream should process all buferred messages and exit
    describe('with disabled auto.commit and using manual `commit` on `close` called', () => {
      test('as iterable', async () => {
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

        for await (const incommingMessage of consumerStream) {
          const messages = msgsToArr(incommingMessage)
          receivedMessages.push(...messages)

          if (!closeCalled && receivedMessages.length > 2) {
            closeCalled = true
            consumerStream.close(() => {
              service.log.debug('closed connection')
            })
          }
          commitBatch(consumerStream, messages)
        }
        // we should receive only first pack of messages
        expect(receivedMessages).toHaveLength(5)
      })

      test('as stream', async () => {
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

        const transformStream = new Transform({
          objectMode: true,
          transform(chunk, _, callback) {
            const messages = msgsToArr(chunk)
            receivedMessages.push(...messages)

            if (!closeCalled && receivedMessages.length > 3) {
              closeCalled = true
              consumerStream.close(() => {
                service.log.debug('closed connection')
              })
            }
            commitBatch(consumerStream, messages)
            callback()
          },
        })

        await pipeline(consumerStream, transformStream)

        // we should receive only first pack of messages
        expect(receivedMessages).toHaveLength(5)
      })
    })

    describe('should exit when topic is empty', () => {

      test('as iterable', async () => {
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
          },
        })

        const receivedMessages = await readStream(consumerStream)
        expect(receivedMessages).toHaveLength(0)
      })

      test('as stream', async () => {
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
          },
        })

        const receivedMessages: any[] = []

        const transformStream = new Transform({
          objectMode: true,
          transform(chunk, _, callback) {
            const messages = msgsToArr(chunk)
            receivedMessages.push(...messages)
            const message = messages[messages.length-1]
            consumerStream.consumer.commitMessage(message)
            callback()
          },
        })

        await pipeline(consumerStream, transformStream)
        expect(receivedMessages).toHaveLength(0)
      })
    })

    test('with disabled auto.commit and using manual `commit` in batchMode on `close` called', async () => {
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

      for await (const incommingMessage of consumerStream) {
        const messages = msgsToArr(incommingMessage)
        receivedMessages.push(...messages)

        if (!closeCalled && receivedMessages.length > 2) {
          closeCalled = true
          consumerStream.close(() => {
            service.log.debug('closed connection')
          })
        }

        const message = messages[messages.length-1]
        consumerStream.consumer.commitMessage(message)

      }
      // we should receive only 1 pack of messages
      expect(receivedMessages).toHaveLength(5)
    })

    test('with auto.commit enabled', async () => {
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
      expect(receivedMessages).toHaveLength(sentMessages.length)
    })

    test('with auto.commit enabled RegExp subscribe', async () => {
      const topic = 'test-regexp-topic-1'

      producer = await createProducerStream(service)
      const sentMessages = await sendMessages(producer, topic, 13)

      consumerStream = await createConsumerStream(service, {
        streamOptions: {
          topics: [
            /^test-regexp-.*$/,
            /^test-reg2-.*$/,
          ]
        },
        conf: {
          'enable.auto.commit': false,
          'group.id': topic,
        },
      })

      const receivedMessages = await readStream(consumerStream)
      expect(receivedMessages).toHaveLength(sentMessages.length)
    })

    test('with auto.commit enabled and manual `offsetsStore`', async () => {
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
      for await (const incommingMessage of consumerStream) {
        const messages = msgsToArr(incommingMessage)
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

      expect(receivedMessages).toHaveLength(sentMessages.length)

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
      expect(newMessages).toHaveLength(0)
    })
  })
})

describe('#2s-toxified', () => {
  let service: Microfleet
  let producer: KafkaProducerStream
  let consumerStream: KafkaConsumerStream

  beforeEach(async () => {
    service = new Microfleet({
      name: 'tester',
      plugins: ['logger', 'validator', 'kafka'],
      kafka: {
        'metadata.broker.list': 'kafka:39092',
        'group.id': 'test-group',
        'fetch.wait.max.ms': 50,
      },
    })
  })

  const setProxyEnabled = async (enabled: boolean) => {
    const proxy = await toxiproxy.get('kafka-proxy-2s')
    proxy.enabled = enabled
    await proxy.update()
  }

  afterEach(async () => {
    await setProxyEnabled(true)
    await service.close()
    service.log.debug('>>>>> done test')
  })

  describe('no-auto-commit commitSync', () => {
    test('as stream', async () => {
      const topic = 'toxified-test-no-auto-commit-no-batch-eof-stream'
      producer = await createProducerStream(service)

      const receivedMessages: any[] = []

      await sendMessages(producer, topic, 10)
      service.log.debug('test: done publishing messagess')
      await producer.closeAsync()
      service.log.debug('test: producer closed')
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

      // throw throught sync method
      consumerStream.setOnCommitErrorHandler(() => false)

      const transformStream = new Transform({
        objectMode: true,
        async transform(chunk, _, callback) {
          const messages = msgsToArr(chunk)
          receivedMessages.push(...messages)
          if (!blockedOnce) {
            await setProxyEnabled(false)
            delay(2000).then( async () => {
              service.log.debug('Enable proxy')
              await setProxyEnabled(true)
              service.log.debug('Proxy enabled')
              service.emit('proxy-enabled')
            })
            blockedOnce = true
          }

          try {
            const message = messages[messages.length-1]
            consumerStream.consumer.commitMessageSync(message)
            callback()
          } catch (e) {
            service.log.debug({ topic, err: e }, 'commit sync error')
            callback(e)
          }
        }
      })

      await Promise.allSettled([
        // We should provide more verbal error description
        // but here we can receive lots of errors
        expect(pipeline(consumerStream, transformStream)).rejects.toThrowError(LibrdKafkaErrorClass),
        () => once(service, 'proxy-enabled')
      ])

      await consumerStream.closeAsync()

      service.log.debug({ topic },'start the second read sequence')

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
      service.log.debug({ topic }, 'done the second read sequence')
      expect(newMessages).toHaveLength(10)
    })

    // shows sync commit failure
    test('as iterable', async () => {
      const topic = 'toxified-test-no-auto-commit-no-batch-eof'
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

      const simOne = async () => {
        for await (const incommingMessage of consumerStream) {
          const messages = msgsToArr(incommingMessage)
          receivedMessages.push(...messages)
          if (!blockedOnce) {
            await setProxyEnabled(false)
            delay(2000).then(async () => {
              await setProxyEnabled(true)
              service.emit('proxy-enabled')
            })
            blockedOnce = true
          }

          try {
            const message = messages[messages.length-1]
            consumerStream.consumer.commitMessageSync(message)
          } catch (e) {
            service.log.debug({ err: e }, 'commit sync error')
            throw e
          }
        }
        service.log.debug('TEST ENDOF FOR LOOP')
      }

        // We should provide more verbal error description
        // but here we can receive lots of errors
      await expect(simOne()).rejects.toThrowError(LibrdKafkaErrorClass)

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
      expect(newMessages).toHaveLength(10)
    })
  })

  // shows successfull commit recovery
  // sometimes kafka still not connected to the broker
  // test will pass in this condition
  test('block after first commit no-auto-commit', async () => {
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
          delay(2000)
            .then(() => setProxyEnabled(true))
            .tap(() => { service.log.debug('ENABLED connection') })
        }
      }
    }

    try {
      await simOne()
      await consumerStream.closeAsync()
    } catch (e) {
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
    expect(newMessages).toHaveLength(0)
  })

})

describe('#consumer parallel reads', () => {
  let service: Microfleet

  beforeEach(async () => {
    service = new Microfleet({
      name: 'tester',
      plugins: ['logger', 'validator', 'kafka'],
      kafka: {
        'metadata.broker.list': 'kafka:49092',
        'group.id': 'test-group',
        // debug: 'consumer',
      },
    })
  })

  afterEach(async () => {
    await service.close()
  })

  const createConsumer = async (topic: string): Promise<KafkaConsumerStream> => {
    return createConsumerStream(service, {
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

  it('processes messages in parallel', async () => {
    const topic = 'parallel-read'

    const producer = await createProducerStream(service)
    await sendMessages(producer, topic, 33)

    const consumer1 = await createConsumer(topic)
    const consumer2 = await createConsumer(topic)

    const result = await Promise.all([
      consumeMessages(consumer1),
      consumeMessages(consumer2),
    ])

    expect([...result[0], ...result[1]]).toHaveLength(33)
    await consumer1.closeAsync()
    await consumer2.closeAsync()
  })

  it('additional consumer connects after processing started', async () => {
    const topic = 'parallel-read-consumer-connect-after'
    const emitter = new EventEmitter()

    const producer = await createProducerStream(service)
    await sendMessages(producer, topic, 22)

    const consumers: { [key: string]: KafkaConsumerStream } = {}

    consumers['consumer1'] = await createConsumer(topic)

    const firstRead = consumeMessages(consumers.consumer1, async () => {
      if (!consumers.consumer2) {
        await once(consumers.consumer1.consumer, 'offset.commit')
        consumers.consumer2 = await createConsumer(topic)
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

    expect([...result[0], ...result[1]]).toHaveLength(22)
    await consumers.consumer1.closeAsync()

    expect(consumers.consumer2).toBeDefined()
    await consumers.consumer2.closeAsync()
  })
})

describe('#8s-toxified', () => {
  let service: Microfleet
  let producer: KafkaProducerStream
  let consumerStream: KafkaConsumerStream

  beforeEach(async () => {
    service = new Microfleet({
      name: 'tester',
      plugins: ['logger', 'validator', 'kafka'],
      kafka: {
        'metadata.broker.list': 'kafka:29092',
        'group.id': 'test-group',
        'fetch.wait.max.ms': 50,
      },
    })
  })

  afterEach(async () => {
    await service.close()
  })

  const setProxyEnabled = async (enabled: boolean) => {
    const proxy = await toxiproxy.get('kafka-proxy')
    proxy.enabled = enabled
    await proxy.update()
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
      for await (const incommingMessage of consumerStream) {
        const messages = msgsToArr(incommingMessage)
        receivedMessages.push(...messages)
        const lastMessage = messages[messages.length-1]

        if (!blockedOnce && receivedMessages.length == 4) {
          service.log.debug('BLOCKING connection')
          blockedOnce = true
          await setProxyEnabled(false)
          delay(9000)
            .then(() => setProxyEnabled(true))
            .tap(() => { service.log.debug('ENABLED connection') })
        }
        consumerStream.consumer.commitMessage(lastMessage)
        await once(consumerStream.consumer, 'offset.commit')
      }
    }

    await expect(simOne()).rejects.toThrowError(OffsetCommitError)
    expect(receivedMessages).toHaveLength(4)

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

    expect(newMessages).toHaveLength(8)
  })
})

describe('#connect-toxified', () => {
  let service: Microfleet

  beforeEach(async () => {
    service = new Microfleet({
      name: 'tester',
      plugins: ['logger', 'validator', 'kafka'],
      kafka: {
        'metadata.broker.list': 'kafka:49092',
        'group.id': 'test-group',
        'fetch.wait.max.ms': 50,
        debug: 'consumer',
      },
    })
  })

  afterEach(async () => {
    await service.close()
  })

  const setProxyEnabled = async (enabled: boolean) => {
    const proxy = await toxiproxy.get('kafka-proxy-small-timeout')
    proxy.enabled = enabled
    await proxy.update()
  }

  beforeEach(async () => {
    await setProxyEnabled(false)
  })

  afterEach(async () => {
    await setProxyEnabled(true)
  })

  it('producer connection timeout', async () => {
    const { kafka } = service
    const createPromise = kafka.createProducerStream({
      streamOptions: { objectMode: false, topic: 'testBoo', connectOptions: { timeout: 200 } },
      conf: { 'client.id': 'consume-group-offline' },
    })
    await expect(createPromise).rejects.toThrowError(/Broker transport failure/)
  })

  it('consumer connection timeout', async () => {
    const { kafka } = service
    const createPromise = kafka.createConsumerStream({
      streamOptions: {
        topics: ['test'],
        connectOptions: { timeout: 200 },
      },
      conf: { 'client.id': 'consume-group-offline' },
    })
    await expect(createPromise).rejects.toThrowError(/Broker transport failure/)
  })
})
