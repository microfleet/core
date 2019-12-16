import { delay } from 'bluebird'
import { KafkaConfig } from '../types'

import { Microfleet } from '@microfleet/core'
import { KafkaFactory } from '../factory'

const testKafkaConfig: KafkaConfig = {
  connection: {
    'metadata.broker.list': 'kafka:9092',
    'group.id': 'test-group',
    'enable.auto.commit': false,
    'message.send.max.retries': 3, // ???
    debug: 'all',
  },
  producer: {
    deliveryTimeout: 5000,
    stream: {
      pollInterval: 10,
      autoClose: true,
    },
    topicConfig: {
      'message.timeout.ms': 2000,
      'request.required.acks': 1,
    },
  },
};

(async () => {
  const service = new Microfleet({
    name: 'kafka-test',
    plugins: ['validator', 'logger'],
    logger: {
      defaultLogger: true,
    },
  })

  const kafka = new KafkaFactory(service, testKafkaConfig)

  const producer = kafka.createProducer()
  await producer.connect()

  let count = 0
  while (count < 10000) {
    console.debug('sending message', count, 'connected:', producer._producer.isConnected())

    await producer
      .write('test-topic', Buffer.from(JSON.stringify({ hello: count, time: Date.now() })))
      .catch((e) => {
        console.debug('Unable to send message', e)
      })

    count += 1

    await delay(10000)
  }

})()
