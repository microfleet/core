import { Toxiproxy } from 'toxiproxy-node-client'
import { Microfleet } from '@microfleet/core'
import { defaultsDeep } from 'lodash'
import { once } from 'events'
import { delay } from 'bluebird'

import {
  KafkaFactory,
  TrackableConsumerStream,
  ProducerStream,
  KafkaStreamOpts,
  ProducerStreamOptions,
  ConsumerStreamOptions,
  TopicNotFoundError
} from '../../src'

let service: Microfleet
let producer: ProducerStream
let consumerStream: TrackableConsumerStream

beforeEach(async () => {
  service = new Microfleet({
    name: 'tester',
    plugins: ['logger', 'validator', 'kafka'],
    kafka: {
      'metadata.broker.list': 'kafka:9092',
      'group.id': 'test-group',
      'fetch.wait.max.ms': 400,
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
    const kafka = service.kafka as unknown as KafkaFactory

    const streamToClose = await kafka.createProducerStream({
      streamOptions: { objectMode: false, topic: 'testBoo' },
      conf: { 'group.id': 'track-group' },
      topicConf: {},
    })

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
      conf: { 'group.id': 'track-close-group' },
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

  type PartialProducerStreamConfig = Partial<KafkaStreamOpts<ProducerStreamOptions>>
  async function createProducerStream(extraConfig: PartialProducerStreamConfig): Promise<ProducerStream> {
    const { kafka } = service
    const config = defaultsDeep(
      {
        streamOptions: { objectMode: true, pollInterval: 1 },
        conf: {
          dr_msg_cb: true,
        },
      },
      extraConfig
    )
    console.debug('CREATE PRODUCER', config)
    return kafka.createProducerStream(config)
  }

  type PartialConsumerStreamConfig = Partial<KafkaStreamOpts<ConsumerStreamOptions>>
  async function createConsumerStream(extraConfig: PartialConsumerStreamConfig): Promise<TrackableConsumerStream> {
    const { kafka } = service
    const config = defaultsDeep(
      {
        streamOptions: {
          streamAsBatch: true,
          fetchSize: 2,
          stopOnPartitionsEOF: false,
          objectMode: true,
        },
        conf: {
          debug: 'consumer,topic,cgrp',
          'group.id': 'auto-commit-consumer',
        },
        topicConf: {
          'auto.offset.reset': 'earliest',
        },
      },
      extraConfig
    )
    console.debug('CREATE CONSUMER', config)
    return kafka.createConsumerStream(config)
  }

  // we must wait for message delivery
  // otherwise we will try to create consumer,
  // but there will be no available topic metadata in Kafka
  async function sendMessages(targetProducer: ProducerStream, topic: string, count = 10): Promise<any[]> {
    const messageIterable = getMessageIterable(count)

    for await (const message of messageIterable.messagesToSend(topic)) {
      targetProducer.write(message)
      await once(targetProducer.producer, 'delivery-report')
    }

    return messageIterable.sentMessages
  }

  test('consume/produce noAutoCommit manualOffetStore', async () => {
    const topic = 'test-no-auto-commit-manual-offset-store'

    producer = await createProducerStream({
      conf: { 'group.id': 'auto-commit-producer' },
    })

    const sentMessages = await sendMessages(producer, topic, 10)

    consumerStream = await createConsumerStream({
      streamOptions: {
        topics: topic,
      },
      conf: {
        'auto.commit.enable': false,
        'enable.auto.offset.store': false,
        'group.id' : 'noautocommit-nooffsetstore-consumer',
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

    producer = await createProducerStream({
      conf: { 'group.id': 'auto-commit-producer' },
    })

    const sentMessages = await sendMessages(producer, topic, 10)

    consumerStream = await createConsumerStream({
      streamOptions: {
        topics: topic,
      },
      conf: {
        'auto.commit.enable': false,
        'group.id' : 'no-auto-commit-manual',
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

    producer = await createProducerStream({
      conf: { 'group.id': 'auto-commit-producer' },
    })

    const sentMessages = await sendMessages(producer, topic, 10)

    consumerStream = await createConsumerStream({
      streamOptions: {
        topics: topic,
      },
      conf: {
        'auto.commit.enable': true,
        'group.id' : 'no-auto-commit-manual',
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

    producer = await createProducerStream({
      conf: { 'group.id': 'auto-commit-producer' },
    })

    const sentMessages = await sendMessages(producer, topic, 10)
    console.debug('DEBUG messages sent')

    consumerStream = await createConsumerStream({
      streamOptions: {
        topics: topic,
      },
      conf: {
        'auto.commit.enable': true,
        'enable.auto.offset.store': false,
        'group.id' : 'autocommit-nooffsetstore-consumer',
      },
    })

    console.debug('DEBUG fetch messages')
    const receivedMessages: any[] = []
    for await (const incommingMessage of consumerStream) {
      const messages = Array.isArray(incommingMessage) ? incommingMessage : [incommingMessage]
      receivedMessages.push(...messages)
      for (const message of messages) {
        console.debug('DEBUG offsetStore')
        consumerStream.consumer.offsetsStore([{
          topic: message.topic,
          partition: message.partition,
          offset: message.offset + 1,
        }])
      }
    }

    expect(receivedMessages).toHaveLength(sentMessages.length)
  })
  describe('toxified', () => {
    const toxiproxy = new Toxiproxy('http://toxy:8474')

    const setProxyEnabled = async (enabled: boolean) => {
      const proxy = await toxiproxy.get('kafka-proxy')
      proxy.enabled = enabled
      await proxy.update()
    }

    test('10 seconds delay no-auto-commit', async () => {
      const topic = '10s-toxified-test-no-auto-commit-no-batch-eof'
      producer = await createProducerStream({ conf: { 'group.id': 'no-commit-producer' } })

      const receivedMessages: any[] = []

      const sentMessages = await sendMessages(producer, topic, 1)

      consumerStream = await createConsumerStream({
        streamOptions: {
          topics: topic,
        },
        conf: {
          'auto.commit.enable': false,
          'group.id': 'toxified-no-commit-consumer',
        },
      })

      // yes it should be executed parallel
      delay(10000)
        .then(() => setProxyEnabled(true))
        .then(() => sendMessages(producer, topic, 1))
        .then((msgs) => {
          sentMessages.push(...msgs)
          console.debug('proxy enabled again', new Date().toString())
        })

      let blockedOnce = false

      for await (const incommingMessage of consumerStream) {
        const messages = Array.isArray(incommingMessage) ? incommingMessage : [incommingMessage]
        receivedMessages.push(...messages)

        if (!blockedOnce) {
          await setProxyEnabled(false)
          console.debug('Blocked kafka connection', new Date().toString())
          blockedOnce = true
        }
        console.debug('Message commit sending', new Date().toString())
        consumerStream.consumer.commitMessage(messages.pop())
        console.debug('Message commit sent', new Date().toString())
      }

      console.debug('DONE READING')

      expect(receivedMessages).toHaveLength(sentMessages.length)

      await consumerStream.closeAsync()

      consumerStream = await createConsumerStream({
        streamOptions: {
          topics: topic,
        },
        conf: {
          'auto.commit.enable': false,
          'group.id': 'toxified-no-commit-consumer',
        },
      })

      console.debug('SECONDARY READING')
      await sendMessages(producer, topic, 1)
      const newMessages = []
      for await (const incommingMessage of consumerStream) {
        const messages = Array.isArray(incommingMessage) ? incommingMessage : [incommingMessage]
        newMessages.push(...messages)
      }

      console.debug('DONE SECONDARY READING')
      expect(newMessages).toHaveLength(1)
    })

    test('2s delay no-auto-commit commitSync', async () => {
      const topic = 'toxified-test-no-auto-commit-no-batch-eof'
      producer = await createProducerStream({ conf: { 'group.id': 'no-commit-producer' } })

      const receivedMessages: any[] = []

      const sentMessages = await sendMessages(producer, topic, 1)

      consumerStream = await createConsumerStream({
        streamOptions: {
          topics: topic,
        },
        conf: {
          'auto.commit.enable': false,
          'message.timeout.ms': 5000, // checkme
          'group.id': 'toxified-no-commit-consumer',
        },
      })

      // yes it should be executed parallel
      delay(2000)
        .then(() => setProxyEnabled(true))
        .then(() => sendMessages(producer, topic, 1))
        .then((msgs) => {
          sentMessages.push(...msgs)
          console.debug('proxy enabled again', new Date().toString())
        })

      let blockedOnce = false

      const simOne = async () => {
        for await (const incommingMessage of consumerStream) {
          const messages = Array.isArray(incommingMessage) ? incommingMessage : [incommingMessage]
          receivedMessages.push(...messages)

          if (!blockedOnce) {
            await setProxyEnabled(false)
            console.debug('Blocked kafka connection', new Date().toString())
            blockedOnce = true
          }
          console.debug('Message commit sending', new Date().toString())
          consumerStream.consumer.commitMessageSync(messages.pop())
          console.debug('Message commit sent', new Date().toString())
        }
      }

      await expect(simOne()).rejects.toThrowError(/Local: Waiting for coordinator/)

      console.debug('DONE READING')

      expect(receivedMessages).toHaveLength(sentMessages.length)

      await consumerStream.closeAsync()

      consumerStream = await createConsumerStream({
        streamOptions: {
          topics: topic,
        },
        conf: {
          'auto.commit.enable': false,
          'group.id': 'toxified-no-commit-consumer',
        },
      })

      console.debug('SECONDARY READING')
      await sendMessages(producer, topic, 1)
      const newMessages = []
      for await (const incommingMessage of consumerStream) {
        const messages = Array.isArray(incommingMessage) ? incommingMessage : [incommingMessage]
        newMessages.push(...messages)
      }

      console.debug('DONE SECONDARY READING')
      expect(newMessages).toHaveLength(1)
    })
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
