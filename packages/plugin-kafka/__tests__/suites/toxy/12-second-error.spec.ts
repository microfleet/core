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
      'metadata.broker.list': 'kafka:29092',
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
  const proxy = await toxiproxy.get('kafka-proxy')
  proxy.enabled = enabled
  await proxy.update()
}

describe('toxified', () => {
  // shows bad situation
  // messages resent again

  beforeEach(() => {
    // @ts-ignore
    service.log.info('STARTING TEST >>>>', jasmine.currentTest.fullName)
  })

  afterEach(() => {
    // @ts-ignore
    service.log.info('ENDING TEST >>>>', jasmine.currentTest.fullName)
  })

  test('12 seconds delay no-auto-commit', async () => {
    const topic = '12s-toxified-test-no-auto-commit-no-batch-eof'
    producer = await createProducerStream(service)

    const receivedMessages: any[] = []

    await sendMessages(producer, topic, 4)

    consumerStream = await createConsumerStream(service, {
      streamOptions: {
        topics: topic,
      },
      conf: {
        'group.id': 'toxified-no-commit-consumer',
        offset_commit_cb: true,
        'enable.auto.commit': false,
      },
    })

    // yes it should be executed parallel
    delay(12000)
      .then(() => setProxyEnabled(true))
      .then(() => {
        service.log.debug('proxy enabled again', new Date().toString())
      })

    let blockedOnce = false

    for await (const incommingMessage of consumerStream) {
      const messages = Array.isArray(incommingMessage) ? incommingMessage : [incommingMessage]
      receivedMessages.push(...messages)

      if (!blockedOnce) {
        await setProxyEnabled(false)
        blockedOnce = true
      }
      consumerStream.consumer.commitMessage(messages.pop())
    }

    service.log.debug('end of the first read sequence')
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

    expect(newMessages).toHaveLength(0)
  })

  test('12 seconds delay after first commit no-auto-commit', async () => {
    const topic = 'fisrt-commit-12s-toxified-test-no-auto-commit-no-batch-eof'
    producer = await createProducerStream(service)

    const receivedMessages: any[] = []

    await sendMessages(producer, topic, 4)

    consumerStream = await createConsumerStream(service, {
      streamOptions: {
        topics: topic,
      },
      conf: {
        'group.id': 'first-commit-long-toxified-no-commit-consumer',
        offset_commit_cb: true,
        'enable.auto.commit': false,
      },
    })

    let blockedOnce = false

    for await (const incommingMessage of consumerStream) {
      const messages = Array.isArray(incommingMessage) ? incommingMessage : [incommingMessage]
      receivedMessages.push(...messages)
      const lastMessage = messages.pop()

      service.log.warn({ lastMessage }, 'TEST COMMIT')
      consumerStream.consumer.commitMessage(lastMessage)

      if (!blockedOnce) {
        service.log.warn('waiting for first commit')
        await once(consumerStream.consumer, 'offset.commit')

        service.log.error('BLOCKING connection')
        blockedOnce = true
        await setProxyEnabled(false)
        delay(12000)
          .then(() => setProxyEnabled(true))
          .tap(() => { service.log.error('ENABLED connection') })
      }
    }

    await consumerStream.closeAsync()

    consumerStream = await createConsumerStream(service, {
      streamOptions: {
        topics: topic,
      },
      conf: {
        'group.id': 'long-toxified-no-commit-consumer',
        'enable.auto.commit': false,
      },
    })

    const newMessages = []
    for await (const incommingMessage of consumerStream) {
      const messages = Array.isArray(incommingMessage) ? incommingMessage : [incommingMessage]
      newMessages.push(...messages)
      consumerStream.consumer.commitMessage(messages.pop())
    }

    expect(newMessages).toHaveLength(4)
  })
})
