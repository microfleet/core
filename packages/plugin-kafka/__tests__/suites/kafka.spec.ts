import { Microfleet } from '@microfleet/core'
import { once } from 'events'

import {
  KafkaFactory,
  KafkaConsumerStream,
  KafkaProducerStream,
  TopicNotFoundError,
  ConsumerStreamMessage
} from '@microfleet/plugin-kafka'

import { createProducerStream, createConsumerStream, sendMessages } from '../helpers/kafka'

let service: Microfleet
let producer: typeof KafkaProducerStream
let consumerStream: KafkaConsumerStream

beforeEach(() => {
  service = new Microfleet({
    name: 'tester',
    plugins: ['logger', 'validator', 'kafka'],
    kafka: {
      'metadata.broker.list': 'kafka:9092',
      'group.id': 'test-group',
      'fetch.wait.max.ms': 10,
    },
  })

  // @ts-ignore
  service.log.info('STARTING TEST >>>>', jasmine.currentTest.fullName)
})

afterEach(async () => {
  await service.close()

  // @ts-ignore
  service.log.info('ENDING TEST >>>>', jasmine.currentTest.fullName)
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

  describe('consumer missing topic', () => {
    test('with allTopics: true', async () => {
      const { kafka } = service

      const req = kafka.createConsumerStream({
        streamOptions: { topics: ['test-not-found'], connectOptions: { allTopics: true } },
      })

      await expect(req).rejects.toThrowError(TopicNotFoundError)
    })

    test('with topic: value', async () => {
      const { kafka } = service

      const req = kafka.createConsumerStream({
        streamOptions: { topics: ['test-not-found'], connectOptions: { topic: ['test-not-found'] } },
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
        'delivery.timeout.ms': 500,
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
    const kafka = service.kafka as unknown as KafkaFactory

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
  test('consume/produce noAutoCommit manualOffetStore', async () => {
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
        'group.id': 'no-auto-commit-no-offset-store-consumer',
      },
    })

    const receivedMessages: any[] = []
    for await (const incommingMessage of consumerStream) {
      const messages = Array.isArray(incommingMessage) ? incommingMessage : [incommingMessage]
      receivedMessages.push(...messages)

      for (const message of messages) {
        consumerStream.consumer.offsetsStore([{
          topic: message.topic,
          partition: message.partition,
          offset: message.offset + 1,
        }])
      }

      consumerStream.consumer.commit()
    }

    expect(receivedMessages).toHaveLength(sentMessages.length)
  })

  test('consume/produce noAutoCommit manualCommit', async () => {
    const topic = 'test-no-auto-commit'

    producer = await createProducerStream(service)

    const sentMessages = await sendMessages(producer, topic, 10)

    consumerStream = await createConsumerStream(service, {
      streamOptions: {
        topics: topic,
      },
      conf: {
        'enable.auto.commit': false,
        'group.id': 'no-auto-commit-manual',
      },
    })

    const receivedMessages: any[] = []
    for await (const incommingMessage of consumerStream) {
      const messages = Array.isArray(incommingMessage) ? incommingMessage : [incommingMessage]
      receivedMessages.push(...messages)
      consumerStream.consumer.commitMessage(messages.pop())
    }

    expect(receivedMessages).toHaveLength(sentMessages.length)
  })

  test('consume/produce autoCommit', async () => {
    const topic = 'test-auto-commit'

    producer = await createProducerStream(service)
    const sentMessages = await sendMessages(producer, topic, 10)

    consumerStream = await createConsumerStream(service, {
      streamOptions: {
        topics: topic,
      },
      conf: {
        'enable.auto.commit': true,
        'group.id': 'auto-commit',
      },
    })

    const receivedMessages: any[] = []
    for await (const incommingMessage of consumerStream) {
      const messages = Array.isArray(incommingMessage) ? incommingMessage : [incommingMessage]
      receivedMessages.push(...messages)
    }

    expect(receivedMessages).toHaveLength(sentMessages.length)
  })

  test('consume/produce autoCommit manualOffsetStore', async () => {
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
        'auto.commit.interval.ms': 100,
        'enable.auto.offset.store': false,
        'group.id': 'auto-commit-no-offset-store-consumer',
      },
    })

    const receivedMessages: any[] = []
    for await (const incommingMessage of consumerStream) {
      const messages: ConsumerStreamMessage[] = Array.isArray(incommingMessage) ? incommingMessage : [incommingMessage]
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
        'group.id': 'auto-commit-no-offset-store-consumer',
      },
    })

    const newMessages = []

    service.log.debug('waiting for stream messages')

    for await (const incommingMessage of consumerStream) {
      const messages = Array.isArray(incommingMessage) ? incommingMessage : [incommingMessage]
      newMessages.push(...messages)
    }

    expect(newMessages).toHaveLength(0)
  })
})
