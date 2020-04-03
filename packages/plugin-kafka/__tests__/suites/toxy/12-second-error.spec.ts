import { Toxiproxy } from 'toxiproxy-node-client'
import { Microfleet } from '@microfleet/core'
import { delay } from 'bluebird'
import { once } from 'events'

import {
  KafkaConsumerStream,
  KafkaProducerStream,
  OffsetCommitError,
} from '@microfleet/plugin-kafka'

import { createProducerStream, createConsumerStream, sendMessages, readStream, msgsToArr } from '../../helpers/kafka'

let service: Microfleet
let producer: KafkaProducerStream
let consumerStream: KafkaConsumerStream

beforeEach(async () => {
  service = new Microfleet({
    name: 'tester',
    plugins: ['logger', 'validator', 'kafka'],
    kafka: {
      // debug: 'all',
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

describe('toxified - messes kafka library(tries to rebalance after disconnected)', () => {
  beforeEach(() => {
    // @ts-ignore
    service.log.info('STARTING TEST >>>>', jasmine.currentTest.fullName)
  })

  afterEach(() => {
    // @ts-ignore
    service.log.info('ENDING TEST >>>>', jasmine.currentTest.fullName)
  })

  test('12 seconds delay after first commit no-auto-commit', async () => {
    const topic = 'first-commit-12s-toxified-test-no-auto-commit-no-batch-eof'
    producer = await createProducerStream(service)

    const receivedMessages: any[] = []

    await sendMessages(producer, topic, 4)

    consumerStream = await createConsumerStream(service, {
      streamOptions: {
        topics: topic,
        fetchSize: 2,
      },
      conf: {
        debug: 'consumer,cgrp,topic',
        'group.id': 'first-commit-long-toxified-no-commit-consumer',
        'enable.auto.commit': false,
      },
    })
    let blockedOnce = false
    const simOne = async () => {
      for await (const incommingMessage of consumerStream) {
        const messages = msgsToArr(incommingMessage)
        receivedMessages.push(...messages)
        const lastMessage = messages.pop()

        consumerStream.consumer.commitMessage(lastMessage)

        if (!blockedOnce) {
          await once(consumerStream.consumer, 'offset.commit')

          service.log.debug('BLOCKING connection')
          blockedOnce = true
          await setProxyEnabled(false)
          delay(12000)
            .then(() => setProxyEnabled(true))
            .tap(() => { service.log.error('ENABLED connection') })
        }
      }
    }

    // we receive messages but our commit invalidated
    await expect(simOne()).rejects.toThrowError(OffsetCommitError)
    // we should check it, but value randomly equal 2|4
    // expect(receivedMessages).toHaveLength(4)

    service.log.debug('READ AGAIN')

    consumerStream = await createConsumerStream(service, {
      streamOptions: {
        topics: topic,
      },
      conf: {
        'group.id': 'first-commit-long-toxified-no-commit-consumer',
        'enable.auto.commit': false,
      },
    })

    const newMessages = await readStream(consumerStream)

    expect(newMessages).toHaveLength(2)
  })
})
