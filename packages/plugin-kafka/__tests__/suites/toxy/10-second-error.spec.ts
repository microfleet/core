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
      'metadata.broker.list': 'kafka:9092',
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
  test('10 seconds delay no-auto-commit', async () => {
    const topic = '10s-toxified-test-no-auto-commit-no-batch-eof'
    producer = await createProducerStream(service)

    const receivedMessages: any[] = []

    const sentMessages = await sendMessages(producer, topic, 1)

    consumerStream = await createConsumerStream(service, {
      streamOptions: {
        topics: topic,
      },
      conf: {
        debug: 'consumer,cgrp,topic',
        'group.id': 'toxified-no-commit-consumer',
        offset_commit_cb: true,
        'enable.auto.commit': false,
      },
    })

    consumerStream.consumer.on('offset.commit', (err) => {
      if (err) consumerStream.destroy(err)
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
        blockedOnce = true
      }
      consumerStream.consumer.commitMessage(messages.pop())
    }

    // expect(receivedMessages).toHaveLength(sentMessages.length * 2)

    // await consumerStream.closeAsync()

    consumerStream = await createConsumerStream(service, {
      streamOptions: {
        topics: topic,
      },
      conf: {
        'group.id': 'toxified-no-commit-consumer',
        'enable.auto.commit': false,
      },
    })

    await sendMessages(producer, topic, 1)
    const newMessages = []
    for await (const incommingMessage of consumerStream) {
      const messages = Array.isArray(incommingMessage) ? incommingMessage : [incommingMessage]
      newMessages.push(...messages)
    }

    expect(newMessages).toHaveLength(sentMessages.length + 1)
  })
})
