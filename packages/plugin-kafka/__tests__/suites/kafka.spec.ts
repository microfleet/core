import { Microfleet } from '@microfleet/core'
import { KafkaPlugin, KafkaFactory } from '../../src'
import { ConsumerStream, ProducerStream } from 'node-rdkafka'
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
  test('should be able to create a producer', async () => {
    producer = await service.kafka.createProducerStream({ objectMode: false, topic: 'testBoo' })
    expect(producer).toBeDefined()
  })

  test('should be able to create a consumer', async () => {
    consumer = await service.kafka.createConsumerStream({ topics: ['test'] })
    expect(consumer).toBeDefined()
  })

  test('tracks streams ', async () => {
    const kafka: KafkaFactory = service.kafka

    const streamToClose = await kafka.createProducerStream(
      { objectMode: false, topic: 'otherTopicBar' },
      { 'group.id': 'track-group' },
      {}
    )
    const streamToCloseToo = await kafka.createConsumerStream(
      { topics: 'otherTopicBar' },
      { 'group.id': 'track-group' },
      { 'auto.offset.reset': 'earliest' }
    )

    expect(kafka.getStreams().size).toEqual(2)

    await promisify(streamToClose.close.bind(streamToClose))()
    expect(kafka.getStreams().size).toEqual(1)

    await promisify(streamToCloseToo.close.bind(streamToCloseToo))()
    expect(kafka.getStreams().size).toEqual(0)
  })

  test('closes streams on service shutdown', async () => {
    const kafka: KafkaFactory = service.kafka

    await kafka.createProducerStream(
      { objectMode: false, topic: 'otherTopicBaz' },
      { 'group.id': 'track-close-group' }
    )

    await kafka.createConsumerStream(
      { topics: 'otherTopicBaz' },
      { 'group.id': 'track-close-group' },
      { 'auto.offset.reset': 'earliest' }
    )

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
    const topic = 'test-no-auto-consume-produce'
    const messagesToPublish = 5

    const messageIterable = getMessageIterable(messagesToPublish)
    const messageStream = Readable.from(messageIterable.messagesToSend(topic), { autoDestroy: true })

    producer = await service.kafka.createProducerStream({ objectMode: true, pollInterval: 10 }, {
      'group.id': 'other-group',
    })

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

    const pipelinePromise = promisify(pipeline)
    const receivedMessages: any[] = []

    const consumeFn = async () => {
      for await (const incommingMessage of consumer) {
        const messages = Array.isArray(incommingMessage) ? incommingMessage : [incommingMessage]
        receivedMessages.push(...messages)
        consumer.consumer.commitMessageSync(messages.pop())
        if (receivedMessages.length >= messagesToPublish) {
          await promisify(consumer.close.bind(consumer))()
        }
      }
    }

    await pipelinePromise(messageStream, producer)

    await Promise.race([
      consumeFn(),
      new Promise(resolve => setTimeout(() => { consumer.close(); resolve() }, 7000)),
    ])

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
    const createPromise = service.kafka.createProducerStream(
      { objectMode: false, topic: 'testBoo', connectOptions: { timeout: 200 } },
      { 'client.id': 'consume-group-offline' }
    )
    await expect(createPromise).rejects.toThrow(/Broker transport failure/)
  })

  it('consumer connection timeout', async () => {
    const createPromise = service.kafka.createConsumerStream(
      {
        topics: ['test'],
        connectOptions: { timeout: 200 },
      },
      { 'client.id': 'consume-group-offline' }
    )
    await expect(createPromise).rejects.toThrow(/Broker transport failure/)
  })
})
