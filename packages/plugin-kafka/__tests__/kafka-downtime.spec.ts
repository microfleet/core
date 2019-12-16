/**
 * @jest-environment node
 */
jest.setTimeout(30000)

import { Microfleet } from '@microfleet/core'
import { KafkaFactory } from '../src/factory'
import { KafkaConfig } from '../src/types'

import { Toxiproxy } from 'toxiproxy-node-client'

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
        fetchSize: 10,
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

  describe.skip('networ problems', () => {
    let service:Microfleet

    beforeAll(async () => {
      service = await getService(testKafkaConfig)
    })

    afterAll(async () => {
      await service.close()
    })

    it('handles produce timeout', async () => {
      const toxiproxy = new Toxiproxy('http://toxy:8474')
      const kafka: KafkaFactory = service.kafka

      const producer = kafka.createProducer()
      await producer.connect()

      const proxy = await toxiproxy.get('kafka-proxy')
      proxy.enabled = false
      await proxy.update()

      await expect(producer.write('test-topic', { hello: 123 })).rejects.toThrow(/timeout/)

      proxy.enabled = true
      await proxy.update()

      await producer.close()
    })

    it('handles commit timeout', async () => {
      const toxiproxy = new Toxiproxy('http://toxy:8474')
      const kafka: KafkaFactory = service.kafka

      const producer = kafka.createProducer()
      const consumer = kafka.createConsumer()

      await consumer.connect()
      await producer.connect()

      const proxy = await toxiproxy.get('kafka-proxy')

      await producer.write('test-topic', 'my message')

      for await (const message of consumer.consume('test-topic')) {
        proxy.enabled = false
        await proxy.update()
        expect(consumer.commitMessage(message)).rejects.toThrow(/timeout/)
      }

      proxy.enabled = true
      await proxy.update()

      await producer.close()
    })
  })

})
