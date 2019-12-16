import { KafkaConfig } from '../types'

import { Microfleet } from '@microfleet/core'
import { KafkaFactory } from '../factory'
// import logUpdate from 'log-update'
import { inspect } from 'util'

// @ts-ignore
const testKafkaConfig: KafkaConfig = {
  connection: {
    'metadata.broker.list': 'kafka:9092',
    debug: 'all',
  },
  consumer: {
    commitTimeout: 5000,
    stream: {
      fetchSize: 10,
      waitInterval: 100,
      topics: 'test-topic',
    },
    connection: {
      'group.id': 'test-group',
      'enable.auto.commit': false,
    },
    topicConfig: {
      'auto.offset.reset': 'earliest',
    },
  },
};

(async () => {
  console.debug('starting')
  const service = new Microfleet({
    name: 'kafka-consumer',
    plugins: ['validator', 'logger'],
    sigterm: false,
    logger: {
      defaultLogger: true,
    },
  })

  const kafka = new KafkaFactory(service, testKafkaConfig)
  console.debug('getting stream')
  const consumer = kafka.createConsumer()
  let totalMessages = 0

  console.debug('waiting message')

  const stream = consumer.consume('test-topic')

  for await (const d of stream) {
    await consumer.commitMessage(d)
    totalMessages += 1
    const msg = `Total: ${totalMessages}\n LastMessage: ${d.value.toString()} \n ${inspect(d, { colors: true, depth: null })}`
    console.debug(msg)
  }

  console.debug('DONE')

})()
