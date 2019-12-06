import { Microfleet } from '@microfleet/core'
import { KafkaPlugin } from '../lib/kafka'
import { ConsumerStream, ProducerStream } from 'node-rdkafka'

let service: Microfleet | Microfleet & KafkaPlugin
let kafka: KafkaPlugin
let producer: ProducerStream
let consumer: ConsumerStream

test('should be able to initialize', async () => {
  service = new Microfleet({
    name: 'tester',
    plugins: ['logger', 'validator', 'kafka'],
    kafka: {
      'metadata.broker.list': 'localhost:9092',
      'group.id': 'test',
    },
  })
})

test('should be able to connect', async () => {
  expect(service.kafka).toBeDefined()
  kafka = service.kafka
})

test('should be able to create a producer', async () => {
  producer = await kafka.createProducer({ topic: 'test', objectMode: true })
  expect(producer).toBeDefined()
})

test('should be able to create a consumer', async () => {
  consumer = await kafka.createConsumer({ topics: ['test'] })
  expect(consumer).toBeDefined()
})

test('should be able to produce a message', async () => {
  producer.write({
    topic: 'test',
    partition: 0,
    value: Buffer.from('kafka-test'),
  })
})

test('should be able to consume messages', async () => {
  for await (const chunk of consumer) {
    expect(chunk).toEqual('kafka-test')
  }
})
