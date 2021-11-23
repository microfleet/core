import { Microfleet } from '@microfleet/core-types'
import { promisifyAll } from 'bluebird'
import { merge } from 'lodash'
import retry = require('bluebird-retry')

import { IAdminClient, AdminClient, TopicMetadata, KafkaClient, Metadata, NewTopic, Producer } from './rdkafka-extra'
import { TopicWaitError } from './errors'
import { KafkaClient as KafkaClientType } from '@microfleet/plugin-kafka-types'
import { KafkaFactory } from '../kafka'

export type RetryOptions = retry.Options

export type CreateTopicRequest = {
  topic: NewTopic;
  client?: KafkaClient;
  params?: RetryOptions;
}

export type DeleteTopicRequest = {
  topic: string;
  client?: KafkaClient;
  params?: RetryOptions;
}

type WaitCriteria = {
  (topic: TopicMetadata): boolean;
  operation: string;
}

const filterTopic = (meta: Metadata, topic: string) => (
  meta.topics.filter(topicMeta => topicMeta.name === topic)
)

export class KafkaAdminClient {
  private service: Microfleet
  private client!: Producer
  private kafka: KafkaFactory

  public adminClient: IAdminClient
  public defaultWaitParams: retry.Options = {
    max_tries: 10,
    throw_original: true,
    interval: 100,
    max_interval: 5000,
    timeout: 15000,
  }

  constructor(service: Microfleet, kafka: KafkaFactory) {
    this.service = service
    this.kafka = kafka
    this.adminClient = this.createAdminClient()
  }

  public close(): void {
    this.service.log.debug('closing admin client')
    this.adminClient.disconnect()
  }

  public async createTopic(req: CreateTopicRequest): Promise<void> {
    const client = req.client || await this.getClient()
    const criteria: WaitCriteria = topic => topic ? true : false
    criteria.operation = 'createTopic'

    await this.adminClient.createTopicAsync(req.topic)
    await this.waitFor(client, req.topic.topic, criteria, req.params)
  }

  public async deleteTopic(req: DeleteTopicRequest): Promise<void> {
    const client = req.client || await this.getClient()
    const criteria: WaitCriteria = topic => topic === undefined
    criteria.operation = 'deleteTopic'

    await this.adminClient.deleteTopicAsync(req.topic)
    await this.waitFor(client, req.topic, criteria, req.params)
  }

  private createAdminClient(): IAdminClient {
    // node-rdkafka Admin client not exported and available only throught `create` function
    // see https://github.com/Blizzard/node-rdkafka/blob/master/lib/admin.js#L11
    const { kafka } = this
    return promisifyAll(AdminClient.create(kafka.rdKafkaConfig))
  }

  private async getClient(): Promise<KafkaClientType> {
    if (!this.client) {
      const { kafka } = this

      this.client = kafka.createClient(Producer, kafka.rdKafkaConfig)
      kafka.attachClientLogger(this.client, this.service.log, { type: 'admin-producer' })

      await this.client.connectAsync({
        allTopics: true,
      })
    }
    return this.client
  }

  private async getTopicFromMeta(client: KafkaClient, topicName: string): Promise<TopicMetadata> {
    const meta = await client.getMetadataAsync({
      allTopics: true
    })
    this.service.log.debug({ meta }, 'getTopicFromMeta')
    const [filtered] = filterTopic(meta, topicName)
    return filtered
  }

  private async waitFor(client: KafkaClient, topicName: string, criteria: WaitCriteria, params?: retry.Options): Promise<TopicMetadata> {
    const retryParams = merge(Object.create(null), this.defaultWaitParams, params)
    let attempts = 0

    return retry(async () => {
      attempts += 1
      const filtered = await this.getTopicFromMeta(client, topicName)
      if (criteria(filtered)) return filtered
      const waitError = new TopicWaitError(`topic '${topicName}' ${criteria.operation} wait error`, params, { attempts, operation: criteria.operation })
      this.service.log.debug({ error: waitError }, 'Operation retry attempt error')
      throw waitError
    }, retryParams)
  }
}
