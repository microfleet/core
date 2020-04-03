import { Toxiproxy } from 'toxiproxy-node-client'
import { Microfleet } from '@microfleet/core'
import { delay } from 'bluebird'
import { once } from 'events'

import {
  KafkaConsumerStream,
  KafkaProducerStream,
} from '@microfleet/plugin-kafka'

import { createProducerStream, createConsumerStream, sendMessages, processReceived, readStream, msgsToArr } from '../../helpers/kafka'

let service: Microfleet
let producer: KafkaProducerStream
let consumerStream: KafkaConsumerStream

beforeEach(async () => {
  service = new Microfleet({
    name: 'tester',
    plugins: ['logger', 'validator', 'kafka'],
    kafka: {
      debug: 'consumer,cgrp',
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

  // shows sync commit failure
  test('no-auto-commit commitSync', async () => {
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
        'group.id': 'toxified-no-commit-consumer',
        'enable.auto.commit': false,
      },
    })

    let blockedOnce = false

    const simOne = async () => {
      for await (const incommingMessage of consumerStream) {
        const messages = msgsToArr(incommingMessage)
        receivedMessages.push(...messages)

        consumerStream.consumer.commitMessageSync(messages.pop())

        if (!blockedOnce) {
          await setProxyEnabled(false)
          delay(2000).then(() => setProxyEnabled(true))
          blockedOnce = true
        }
      }
      service.log.debug('TEST ENDOF FOR LOOP')
    }

    await expect(simOne()).rejects.toThrowError(/Local: Waiting for coordinator/)

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

    const newMessages = await readStream(consumerStream)
    expect(newMessages).toHaveLength(9)
  })

  // shows successfull commit recovery
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
      for await (const incoming of consumerStream) {
        const lastMessage = processReceived(receivedMessages, incoming)
        consumerStream.consumer.commitMessage(lastMessage)

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

    await simOne()

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

    const newMessages = await readStream(consumerStream)
    expect(newMessages).toHaveLength(0)
  })
})
