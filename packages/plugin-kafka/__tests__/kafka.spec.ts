/**
 * @jest-environment node
 */
jest.setTimeout(30000)

import { Microfleet } from '@microfleet/core'
import { KafkaFactory } from '../src/factory'
import { KafkaConfig } from '../src/types'
import { Consumer } from '../src/stream/consumer'
import { Producer } from '../src/stream/producer'
import { Promise } from 'bluebird'

describe('#kafka', () => {

  const testKafkaConfig: KafkaConfig = {
    connection: {
      'metadata.broker.list': 'kafka:9092',
      // debug: 'all',
    },
    producer: {
      deliveryTimeout: 5000,
      stream: {
        pollInterval: 100,
      },
      topicConfig: {
        'message.timeout.ms': 1000,
        'request.required.acks': 1,
      },
    },
    consumer: {
      commitTimeout: 5000,
      connection: {
        'enable.auto.commit': true,
        'group.id': 'test-group',
      },
      stream: {
        fetchSize: 1,
        waitInterval: 100,
      },
      topicConfig: {
        // 'auto.offset.reset': 'earliest',
      },
    },
  }

  async function getService(kafkaConfig: any): Promise<Microfleet> {
    const srv = new Microfleet({
      name: 'kafka-test',
      plugins: ['validator', 'logger', 'kafka'],
      logger: {
        defaultLogger: true,
      },
      kafka: kafkaConfig,
    })
    await srv.connect()
    return srv
  }

  it('attaches', async () => {
    const service = await getService(testKafkaConfig)
    expect(service.kafka).toBeDefined()
  })

  describe('configuration', () => {
    it('rejects if config empty', async () => {
      const service = getService({})
      await expect(service).rejects.toThrow(/kafka validation failed/)
    })

    it('rejects if connecton section empty ', async () => {
      const service = getService({ consumer: testKafkaConfig.consumer, producer: testKafkaConfig.producer })

      const ex = await expect(service).rejects
      ex.toThrow(/required property 'connection'/)
    })

    describe('consumer', () => {
      it('rejects if subconfig empty ', async () => {
        const service = getService({ consumer: { connection: {}, stream: {}, topicConfig: {} } })

        const ex = await expect(service).rejects
        ex.toThrow(/property 'connection'/)
        ex.toThrow(/required property 'commitTimeout'/)
      })
    })

    describe('producer', () => {
      it('rejects if producer section empty', async () => {
        const service = getService({ })

        const ex = await expect(service).rejects
        ex.toThrow(/property 'connection'/)
      })
    })
  })

  describe('consumer', () => {
    let service: Microfleet
    let consumer: Consumer

    beforeAll(async () => {
      console.debug('config', testKafkaConfig)
      service = await getService(testKafkaConfig)
    })

    afterAll(async () => {
      await service.close()
    })

    afterEach(async () => {
      if (consumer.close) {
        await consumer.close()
      }
    })

    it('establishes connection', async () => {
      consumer = new Consumer(service, testKafkaConfig)
      await expect(consumer.connect()).resolves.toEqual(undefined)
    })

    it('throws an error on connection fail', async () => {
      const conf = {
        ...testKafkaConfig,
        connection: {
          ...testKafkaConfig.connection,
          'metadata.broker.list': 'foo1',
        },
      }

      consumer = new Consumer(service, conf)
      await expect(consumer.connect(1000)).rejects.toThrow(/Local: Broker transport failure/)
    })

    it('consume: panics on invalid topic parameter', async () => {
      consumer = new Consumer(service, testKafkaConfig)
      await consumer.connect()
      // @ts-ignore we need this
      expect(() => consumer.consume()).toThrow(/\"topics\" argument must be a string, regex, or an array/)
    })

    it('consume: panics if not connected', async() => {
      consumer = new Consumer(service, testKafkaConfig)
      expect(() => consumer.consume('foo_topic')).toThrow(new Error('Consumer not connected'))
    })
  })

  describe('producer', () => {
    let service: Microfleet
    let producer: Producer

    beforeAll(async () => {
      service = await getService(testKafkaConfig)
    })

    afterAll(async () => {
      await service.close()
    })

    afterEach(async () => {
      if (producer.close) {
        await producer.close()
      }
    })

    it('establishes connection', async () => {
      producer = new Producer(service, testKafkaConfig)
      await expect(producer.connect()).resolves.toEqual(undefined)
    })

    it('throws an error on connection fail', async () => {
      const consumer = new Producer(service, {
        ...testKafkaConfig,
        connection: {
          ...testKafkaConfig.connection,
          'metadata.broker.list': 'foo1',
        },
      })
      await expect(consumer.connect(1000)).rejects.toEqual(new Error('Local: Broker transport failure'))
    })
  })

  describe('stream', () => {
    let service:Microfleet

    beforeAll(async () => {
      service = await getService(testKafkaConfig)
    })

    afterAll(async () => {
      await service.close()
    })

    it('able to produce and consume message', async() => {
      const kafka: KafkaFactory = service.kafka

      const producer = kafka.createProducer()
      const consumer = kafka.createConsumer()

      await consumer.connect()
      await producer.connect()

      const readData = async () => {
        const readMsgs = []
        const stream = consumer.consume('test-topic')
        for await (const d of stream) {
          await consumer.commitMessage(d)
          console.debug('commit', d)
          readMsgs.push(d)
          if (readMsgs.length === 3) {
            break
          }
        }
        return readMsgs
      }

      const writeData = async () => {
        for await (const msg of  ['hello-1', 'hello-2', 'hello-3']) {
          await producer.write('test-topic', Buffer.from(msg))
          console.debug('send', msg)
        }
      }

      // we need some to retrieve messages
      const pauseAndCloseStream = Promise.delay(5000).then(consumer.close.bind(consumer))
      const [data] = await Promise.all([readData(), writeData().then(() => pauseAndCloseStream)])

      expect(data).toHaveLength(3)

      await producer.close()
      await consumer.close()

    })
  })

})
