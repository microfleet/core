import { TopicMetadata, SubscribeTopic, SubscribeTopicList } from 'node-rdkafka'
import { TopicNotFoundError } from './custom/errors'
import type { Level } from 'pino'

/**
 * `librdkafka` uses syslog severity levels
 */
export const kafkaSeverityToLogMapping: { [level: number]: Level } = {
  0: 'fatal', 1: 'fatal',
  2: 'fatal', 3: 'error',
  4: 'warn', 5: 'info',
  6: 'info', 7: 'debug',
}

/**
 * Convert syslog level to generic level
 * @param level syslog level
 */
export function getLogFnName(level: number): Level {
  return kafkaSeverityToLogMapping[level] || 'debug'
}

/**
 * Checks whether topics exist
 * @param data - List of topics received on Client.connect
 * @param topics - Required topics
 */
export function topicExists(data: TopicMetadata[], topics: SubscribeTopic | SubscribeTopicList): void {
  const topicList = Array.isArray(topics) ? topics : [topics]
  for (const topic of topicList) {
    const found = data.find((metaDataTopic) => {
      if (topic instanceof RegExp) return topic.test(metaDataTopic.name)
      return topicList.includes(metaDataTopic.name)
    })

    if (!found) throw new TopicNotFoundError('Missing consumer topic', topics)
  }
}
