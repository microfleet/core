import { Toxiproxy } from 'toxiproxy-node-client'
import { Microfleet } from '@microfleet/core'
import { delay } from 'bluebird'

import {
  KafkaConsumerStream,
  KafkaProducerStream,
} from '@microfleet/plugin-kafka'

import { createProducerStream, createConsumerStream, sendMessages } from '../../helpers/kafka'

let service: Microfleet
let producer: typeof KafkaProducerStream
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

afterEach(async () => {
  await service.close()
})

const toxiproxy = new Toxiproxy('http://toxy:8474')

const setProxyEnabled = async (enabled: boolean) => {
  const proxy = await toxiproxy.get('kafka-proxy-2s')
  proxy.enabled = enabled
  await proxy.update()
}

describe('toxified-2seconds', () => {
  afterEach(async () => {
    await setProxyEnabled(true)
  })

  test('no-auto-commit commitSync', async () => {
    const topic = 'toxified-test-no-auto-commit-no-batch-eof'
    producer = await createProducerStream(service)

    const receivedMessages: any[] = []

    await sendMessages(producer, topic, 3)

    consumerStream = await createConsumerStream(service, {
      streamOptions: {
        topics: topic,
        streamAsBatch: false,
      },
      conf: {
        'group.id': 'toxified-no-commit-consumer',
        'enable.auto.commit': false,
      },
    })

    // yes it should be executed parallel
    await Promise.all([
      delay(2000),
      setProxyEnabled(true),
    ])

    let blockedOnce = false

    const simOne = async () => {
      for await (const incommingMessage of consumerStream) {
        const messages = Array.isArray(incommingMessage) ? incommingMessage : [incommingMessage]
        receivedMessages.push(...messages)

        if (!blockedOnce) {
          await setProxyEnabled(false)
          blockedOnce = true
        }
        consumerStream.consumer.commitMessageSync(messages.pop())
      }
    }

    await expect(simOne()).rejects.toThrowError(/Local: Waiting for coordinator/)

    expect(receivedMessages).toHaveLength(1)
  })
})

describe('connect error toxy', () => {
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
