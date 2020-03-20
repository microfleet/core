import { Microfleet } from '@microfleet/core'
import { defaultsDeep } from 'lodash'
import { once } from 'events'

import {
  ConsumerStream,
  ProducerStream,
  KafkaStreamOpts,
  ProducerStreamOptions,
  ConsumerStreamOptions,
} from '../../src'

function getMessageIterable(count: number) {
  const sentMessages: any[] = []
  function* messagesToSend(topic: string) {
    for (let i = 0; i < count; i += 1) {
      const message = {
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

type PartialProducerStreamConfig = Partial<KafkaStreamOpts<ProducerStreamOptions>>
export async function createProducerStream(
  service: Microfleet,
  extraConfig: PartialProducerStreamConfig
): Promise<ProducerStream> {
  const { kafka } = service
  const config = defaultsDeep(
    {
      streamOptions: { objectMode: true, pollInterval: 1 },
      conf: {
        dr_msg_cb: true,
      },
    },
    extraConfig
  )
  return kafka.createProducerStream(config)
}

type PartialConsumerStreamConfig = Partial<KafkaStreamOpts<ConsumerStreamOptions>>
export async function createConsumerStream(
  service: Microfleet,
  extraConfig: PartialConsumerStreamConfig
): Promise<ConsumerStream> {
  const { kafka } = service
  const config = defaultsDeep(
    {
      streamOptions: {
        streamAsBatch: true,
        fetchSize: 2,
        stopOnPartitionsEOF: true,
      },
      conf: {
        // debug: 'consumer,topic,cgrp',
        'group.id': 'auto-commit-consumer',
      },
      topicConf: {
        'auto.offset.reset': 'earliest',
      },
    },
    extraConfig
  )
  console.debug('CREATE CONSUMER', config)
  return kafka.createConsumerStream(config)
}

// we must wait for message delivery
// otherwise we will try to create consumer,
// but there will be no available topic metadata in Kafka
export async function sendMessages(targetProducer: ProducerStream, topic: string, count = 10): Promise<any[]> {
  const messageIterable = getMessageIterable(count)

  for await (const message of messageIterable.messagesToSend(topic)) {
    targetProducer.write(message)
    await once(targetProducer.producer, 'delivery-report')
  }

  return messageIterable.sentMessages
}
