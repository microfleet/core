import { Microfleet } from '@microfleet/core'
import { KafkaPlugin, KafkaFactory, ConsumerStream, ProducerStream } from '../../src'
import { promisify } from 'util'
import { pipeline, Readable } from 'stream'
import { Toxiproxy } from 'toxiproxy-node-client'

let service: Microfleet | Microfleet & KafkaPlugin
let producer: ProducerStream
let consumer: ConsumerStream

beforeEach(async () => {
  service = new Microfleet({
    name: 'tester',
    plugins: ['logger', 'validator', 'kafka'],
    kafka: {
      debug: 'consumer,cgrp,topic,fetch',
      'metadata.broker.list': 'kafka:9092',
      'group.id': 'test-group',
    },
  })
})

afterEach(async () => {
  await service.close()
})

describe('connect', () => {
  test('should be able to create a producer stream', async () => {
    const kafka: KafkaFactory = service.kafka
    producer = await kafka.createProducerStream({
      streamOptions: { objectMode: false, topic: 'testBoo' },
    })
    expect(producer).toBeDefined()
  })

  test('should be able to create a consumer stream', async () => {
    const kafka: KafkaFactory = service.kafka
    consumer = await kafka.createConsumerStream({
      streamOptions: { topics: ['test'] },
    })
    expect(consumer).toBeDefined()
  })
})

describe('conn-track', () => {
  test('tracks streams', async () => {
    const kafka: KafkaFactory = service.kafka

    const streamToClose = await kafka.createProducerStream({
      streamOptions: { objectMode: false, topic: 'otherTopicBar' },
      conf: { 'group.id': 'track-group' },
      topicConf: {},
    })
    const streamToCloseToo = await kafka.createConsumerStream({
      streamOptions: { topics: 'otherTopicBar' },
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
    const kafka: KafkaFactory = service.kafka

    await kafka.createProducerStream({
      streamOptions: { objectMode: false, topic: 'otherTopicBaz' },
      conf: { 'group.id': 'track-close-group' },
    })

    await kafka.createConsumerStream({
      streamOptions: { topics: 'otherTopicBaz' },
      conf: { 'group.id': 'track-close-group' },
      topicConf: { 'auto.offset.reset': 'earliest' },
    })

    await service.close()

    expect(kafka.getStreams().size).toEqual(0)
  })

})

describe('connected to broker', () => {
  function getMessageIterable(count: number) {
    const sentMessages: any[] = []
    function* messagesToSend(topic: string) {
      for (let i = 0; i < count; i += 1) {
        const message = {
          topic,
          value: Buffer.from(`message ${i} at ${Date.now()}`),
        }
        sentMessages.push(message)
        yield message
      }
    }

    return {
      sentMessages,
      messagesToSend,
    }
  }

  test('consume/produce no-auto-commit', async () => {
    const kafka: KafkaFactory = service.kafka
    const topic = 'test-no-auto-consume-produce'
    const messagesToPublish = 5

    const messageIterable = getMessageIterable(messagesToPublish)
    const messageStream = Readable.from(messageIterable.messagesToSend(topic), { autoDestroy: true })

    producer = await kafka.createProducerStream({
      streamOptions: { objectMode: true, pollInterval: 10 },
      conf: { 'group.id': 'other-group' },
    })

    consumer = await kafka.createConsumerStream({
      streamOptions: {
        topics: topic,
        streamAsBatch: true,
        fetchSize: 5,
      },
      conf: {
        debug: 'consumer',
        'auto.commit.enable': false,
        'client.id': 'someid',
        'group.id': 'other-group',
      },
      topicConf: {
        // it's smth like a hack for kafka
        // otherwise consumer stream starts reading from last available offset
        'auto.offset.reset': 'earliest',
      },
    })

    const pipelinePromise = promisify(pipeline)
    const receivedMessages: any[] = []

    await pipelinePromise(messageStream, producer)

    for await (const incommingMessage of consumer) {
      const messages = Array.isArray(incommingMessage) ? incommingMessage : [incommingMessage]
      receivedMessages.push(...messages)
      consumer.consumer.commitMessageSync(messages.pop())

      // we must close consumer manually, otherwise test isn't able to exist 'for await' loop
      if (receivedMessages.length >= messagesToPublish) {
        await consumer.closeAsync()
      }
    }

    expect(receivedMessages).toHaveLength(messagesToPublish)
  })
})

describe('connect error toxy', () => {
  const toxiproxy = new Toxiproxy('http://toxy:8474')

  const setProxyEnabled = async (enabled: boolean) => {
    const proxy = await toxiproxy.get('kafka-proxy')
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
    const kafka: KafkaFactory = service.kafka
    const createPromise = kafka.createProducerStream({
      streamOptions: { objectMode: false, topic: 'testBoo', connectOptions: { timeout: 200 } },
      conf: { 'client.id': 'consume-group-offline' },
    })
    await expect(createPromise).rejects.toThrowError(/Broker transport failure/)
  })

  it('consumer connection timeout', async () => {
    const kafka: KafkaFactory = service.kafka
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
