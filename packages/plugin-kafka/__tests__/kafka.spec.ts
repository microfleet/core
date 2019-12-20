/**
 * @jest-environment node
 */
import { Microfleet } from '@microfleet/core'
import { KafkaPlugin, KafkaFactory } from '../lib/kafka'
import { ConsumerStream, ProducerStream, KafkaConsumer, Producer } from 'node-rdkafka'
import { promisify } from 'util'
import { pipeline, Readable } from 'stream'

const kConsumerStream = require('node-rdkafka/lib/kafka-consumer-stream')
const kProducerStream = require('node-rdkafka/lib/producer-stream')

import sinon, { stub } from 'sinon'

let service: Microfleet | Microfleet & KafkaPlugin
let producer: ProducerStream
let consumer: ConsumerStream

// const wait = async (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

beforeEach(async () => {
  service = new Microfleet({
    name: 'tester',
    plugins: ['logger', 'validator', 'kafka'],
    kafka: {
      connectTimeout: 1000,
      'metadata.broker.list': 'kafka:9092',
      'group.id': 'test-group',
    },
  })
})

afterEach(async () => {
  await service.close()
})

// use dirty stubbing because rdkafka don't likes fast connects and disconnects
// and starts rejecting with LibrdKafkaError { message: 'Local: Erroneous state',
//   code: -172,
//   errno: -172,
//   origin: 'kafka'
// }

describe('connect stubbed', () => {
  let consumerStub: sinon.SinonStub<[any?, (((err: any, data: any) => any) | undefined)?], KafkaConsumer>
  let producerStub: sinon.SinonStub<[any?, (((err: any, data: any) => any) | undefined)?], Producer>
  let consumerStreamStub: sinon.SinonStub<any[], any>
  let producerStreamStub: sinon.SinonStub<any[], any>

  beforeAll(() => {
    consumerStub = stub(KafkaConsumer.prototype, 'connect')
    producerStub = stub(Producer.prototype, 'connect')

    consumerStreamStub = stub(kConsumerStream.prototype, 'connect')
    producerStreamStub = stub(kProducerStream.prototype, 'connect')

    consumerStreamStub.returns(42)
    producerStreamStub.returns(42)
    // @ts-ignore
    consumerStub.callsFake((metadataOptions?: any, cb?: ((err: any, data: any) => any) | undefined) => {
      cb!(null, {})
    })
    // @ts-ignore
    producerStub.callsFake((metadataOptions?: any, cb?: ((err: any, data: any) => any) | undefined) => {
      cb!(null, {})
    })
  })

  afterAll(() => {
    consumerStub.restore()
    producerStub.restore()
    consumerStreamStub.restore()
    producerStreamStub.restore()
  })

  test('should be able to create a producer', async () => {
    producer = await service.kafka.createProducerStream({ objectMode: false, topic: 'testBoo' }, { 'client.id': 'produce-group' })
    expect(producer).toBeDefined()
  })

  test('should be able to create a consumer', async () => {
    consumer = await service.kafka.createConsumerStream({ topics: ['test'] },  { 'client.id': 'consume-group' })
    expect(consumer).toBeDefined()
  })

  test('tracks streams ', async () => {
    const kafka: KafkaFactory = service.kafka

    const streamToClose = await kafka.createProducerStream(
      { objectMode: false, topic: 'otherTopicBar' }
    )
    const streamToCloseToo = await kafka.createConsumerStream(
      { topics: 'otherTopicBar' }
    )
    expect(kafka._streams.size).toEqual(2)

    await promisify(streamToClose.close.bind(streamToClose))()
    expect(kafka._streams.size).toEqual(1)

    await promisify(streamToCloseToo.close.bind(streamToCloseToo))()
    expect(kafka._streams.size).toEqual(0)
  })

  test('closes streams on service shutdown', async () => {
    const kafka: KafkaFactory = service.kafka
    await kafka.createProducerStream(
      { objectMode: false, topic: 'otherTopicBar' }
    )
    await kafka.createConsumerStream(
      { topics: 'otherTopicBar' }
    )

    await service.close()
    expect(kafka._streams.size).toEqual(0)
  })

})

describe('connected', () => {
  function getMessageIterable(count: number) {
    const sentMessages: any[] = []
    function *messagesToSend(topic: string) {
      for (let i = 0; i < count; i += 1) {
        const message =  {
          topic,
          value: Buffer.from(`message ${i} at ${Date.now()}`),
        }
        sentMessages.push(message)
        yield message
      }
    }

    return {
      sentMessages,
      messagesToSend,
    }
  }

  test('consume/produce no-auto-commit', async () => {
    const topic = 'test-no-auto-consume-produce'
    const messagesToPublish = 5

    const messageIterable = getMessageIterable(messagesToPublish)
    const messageStream = Readable.from(messageIterable.messagesToSend(topic), { autoDestroy: true })

    producer = await service.kafka.createProducerStream({ objectMode: true, pollInterval: 10 }, {
      'group.id': 'other-group',
    })

    consumer = await service.kafka.createConsumerStream(
      { topics: topic, streamAsBatch: true, fetchSize: 10 },
      {
        debug: 'consumer',
        'auto.commit.enable': false,
        'client.id': 'someid',
        'group.id': 'other-group',
      },
      {
        'auto.offset.reset': 'earliest',
      }
    )

    const pipelinePromise = promisify(pipeline)
    const receivedMessages:any[] = []

    const consumeFn = async () => {
      for await (const incommingMessage of consumer) {
        const messages = Array.isArray(incommingMessage) ? incommingMessage : [incommingMessage]
        receivedMessages.push(...messages)
        consumer.consumer.commitMessageSync(messages.pop())
        if (receivedMessages.length >= messagesToPublish) {
          await promisify(consumer.close.bind(consumer))()
        }
      }
    }

    await pipelinePromise(messageStream, producer)

    await Promise.race([
      consumeFn(),
      new Promise(resolve => setTimeout(() => { consumer.close(); resolve() }, 5000)),
    ])

    expect(receivedMessages).toHaveLength(messagesToPublish)
  })
})
