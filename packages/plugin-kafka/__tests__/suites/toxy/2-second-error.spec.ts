import { Toxiproxy } from 'toxiproxy-node-client'
import { Microfleet } from '@microfleet/core'
import { delay } from 'bluebird'
import { once } from 'events'

import {
  KafkaConsumerStream,
  KafkaProducerStream,
} from '@microfleet/plugin-kafka'

import { createProducerStream, createConsumerStream, sendMessages } from '../../helpers/kafka'

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
  beforeEach(() => {
    // @ts-ignore
    service.log.info('STARTING TEST >>>>', jasmine.currentTest.fullName)
  })

  afterEach(async () => {
    // @ts-ignore
    service.log.info('ENDING TEST >>>>', jasmine.currentTest.fullName)
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

    let blockedOnce = false

    const simOne = async () => {
      for await (const incommingMessage of consumerStream) {
        const messages = Array.isArray(incommingMessage) ? incommingMessage : [incommingMessage]
        receivedMessages.push(...messages)

        if (!blockedOnce) {
          await setProxyEnabled(false)
          delay(2000).then(() => setProxyEnabled(true))
          blockedOnce = true
        }
        try {
          consumerStream.consumer.commitMessageSync(messages.pop())
        } catch (error) {
          service.log.debug('TEST close stream')
          consumerStream.destroy(error)
          throw error
        }
      }
    }

    await expect(simOne()).rejects.toThrowError(/Local: Waiting for coordinator/)

    await consumerStream.closeAsync()

    service.log.debug('start the second read sequence')

    consumerStream = await createConsumerStream(service, {
      streamOptions: {
        topics: topic,
      },
      conf: {
        'group.id': 'toxified-no-commit-consumer',
        'enable.auto.commit': false,
      },
    })

    const newMessages = []
    for await (const incommingMessage of consumerStream) {
      const messages = Array.isArray(incommingMessage) ? incommingMessage : [incommingMessage]
      newMessages.push(...messages)
      consumerStream.consumer.commitMessage(messages.pop())
    }

    expect(newMessages).toHaveLength(3)

  })

  test('block after first commit no-auto-commit', async () => {
    const topic = 'async-toxified-test-no-auto-commit-no-batch-eof'
    producer = await createProducerStream(service)

    const receivedMessages: any[] = []

    await sendMessages(producer, topic, 4)

    consumerStream = await createConsumerStream(service, {
      streamOptions: {
        topics: topic,
        fetchSize: 2,
      },
      conf: {
        'group.id': 'async-toxified-no-commit-consumer',
        'enable.auto.commit': false,
      },
    })

    let blockedOnce = false

    const simOne = async () => {
      for await (const incommingMessage of consumerStream) {
        const messages = Array.isArray(incommingMessage) ? incommingMessage : [incommingMessage]
        receivedMessages.push(...messages)
        const lastMessage = messages.pop()
        consumerStream.consumer.commitMessage(lastMessage)
        service.log.warn({ lastMessage }, 'TEST COMMIT')
        if (!blockedOnce) {
          service.log.warn('waiting for first commit')
          await once(consumerStream.consumer, 'offset.commit')

          service.log.error('BLOCKING connection')
          blockedOnce = true
          await setProxyEnabled(false)
          delay(2000)
            .then(() => setProxyEnabled(true))
            .tap(() => { service.log.error('ENABLED connection') })
        }
      }
    }

    await simOne()

    await consumerStream.closeAsync()

    service.log.debug('start the second read sequence')

    consumerStream = await createConsumerStream(service, {
      streamOptions: {
        topics: topic,
      },
      conf: {
        'group.id': 'async-toxified-no-commit-consumer',
        'enable.auto.commit': false,
      },
    })

    const newMessages = []
    for await (const incommingMessage of consumerStream) {
      const messages = Array.isArray(incommingMessage) ? incommingMessage : [incommingMessage]
      newMessages.push(...messages)
      consumerStream.consumer.commitMessage(messages.pop())
    }

    expect(newMessages).toHaveLength(0)

  })
})
