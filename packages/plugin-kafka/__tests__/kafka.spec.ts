import { Microfleet } from '@microfleet/core'
import { KafkaPlugin } from '../lib/kafka'
import { Producer, KafkaConsumer } from 'node-rdkafka'

let service: Microfleet | Microfleet & KafkaPlugin
let kafka: KafkaPlugin
let producer: Producer
let consumer: KafkaConsumer

test('should be able to initialize', async () => {
  service = new Microfleet({
    name: 'tester',
    plugins: ['logger', 'validator', 'kafka'],
    kafka: {
      'metadata.broker.list': 'localhost:9092',
    },
  })
})

test('should be able to connect', async () => {
  await service.connect()
  expect(service.kafka).toBeDefined()
  kafka = service.kafka
})

test('should be able to create a producer', async () => {
  producer = await kafka.createProducer()
  expect(producer).toBeDefined()
})
  
test('should be able to create a consumer', async () => {
  consumer = await kafka.createConsumer()
  expect(consumer).toBeDefined()
})

test('should be able to produce and consume a message', async () => {
  producer.produce('test', 0, 'kafka-test')
  consumer.on('ready', () => {
    consumer.subscribe(['test'])
    consumer.consume()
  })
  .on('data', (data) => {
    expect(data).toEqual('kafka-test')
  })
})

test('should be able to disconnect', async () => {
  await service.close()
})

test('should be able to connect again', async () => {
  await service.connect()
})

afterAll(async () => {
  if (service) await service.close()
})
