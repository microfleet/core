import { Microfleet } from '@microfleet/core'
import { merge } from 'lodash'
import { once } from 'events'

import {
  KafkaConsumerStream,
  KafkaProducerStream,
  ProducerStreamConfig,
  ConsumerStreamConfig,
  ConsumerStreamMessage,
} from '@microfleet/plugin-kafka'

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

export async function createProducerStream(
  service: Microfleet,
  extraConfig?: ProducerStreamConfig
): Promise<KafkaProducerStream> {
  const { kafka } = service

  const config = merge(
    {
      streamOptions: { objectMode: true, pollInterval: 1 },
      conf: {
        // eslint-disable-next-line @typescript-eslint/camelcase
        dr_msg_cb: true,
      },
    },
    extraConfig
  )

  return kafka.createProducerStream(config)
}

export async function createConsumerStream(
  service: Microfleet,
  extraConfig: ConsumerStreamConfig
): Promise<KafkaConsumerStream> {
  const { kafka } = service
  const config: ConsumerStreamConfig = merge(
    ({
      streamOptions: {
        streamAsBatch: true,
        fetchSize: 2,
        stopOnPartitionsEOF: true,
        waitInterval: 10,
        // wait abit longer for broker queries
        offsetQueryTimeout: 200,
      },
      conf: {
        // debug: 'consumer,topic,cgrp',
        'group.id': 'auto-commit-consumer',
        'auto.commit.interval.ms': 100,
      },
      topicConf: {
        'auto.offset.reset': 'earliest',
      },
    } as ConsumerStreamConfig),
    extraConfig
  )

  service.log.debug({ config, extraConfig }, 'CREATE CONSUMER')
  const consumerStream = await kafka.createConsumerStream(config)

  // make it faster
  consumerStream.consumer.setDefaultConsumeTimeout(100)

  consumerStream.on('close', () => {
    service.log.debug('TEST stream on close')
  })

  consumerStream.on('end', () => {
    service.log.debug('TEST stream on end')
  })

  consumerStream.on('error', (err) => {
    service.log.debug({ err }, 'TEST stream on error')
  })

  return consumerStream
}

// we must wait for message delivery
// otherwise we will try to create consumer,
// but there will be no available topic metadata in Kafka
export async function sendMessages(
  targetProducer: KafkaProducerStream,
  topic: string, count = 10
): Promise<any[]> {
  const messageIterable = getMessageIterable(count)

  for await (const message of messageIterable.messagesToSend(topic)) {
    targetProducer.write(message)
    await once(targetProducer.producer, 'delivery-report')
  }

  return messageIterable.sentMessages
}

export function commitBatch(stream: KafkaConsumerStream, msgs: ConsumerStreamMessage[]): void {
  process.stdout.write(`\n====Commiting batch:====\n${require('util').inspect({ msgs }, { colors: true })} \n=====\n`)
  msgs.map((msg: ConsumerStreamMessage) => stream.consumer.commitMessage(msg))
}

export function msgsToArr(incommingMessage: ConsumerStreamMessage | ConsumerStreamMessage []) {
  return Array.isArray(incommingMessage) ? incommingMessage : [incommingMessage]
}

export async function readStream(stream: KafkaConsumerStream, commit = true): Promise<ConsumerStreamMessage[]> {
  const messages: ConsumerStreamMessage[] = []
  for await (const batch of stream) {
    const receivedMessages = msgsToArr(batch)
    messages.push(...receivedMessages)
    if (commit) commitBatch(stream, receivedMessages)
  }
  return messages
}
