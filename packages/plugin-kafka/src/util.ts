import { filter } from 'lodash'

import { TopicInfo } from './types'

/**
 * `librdkafka` uses syslog severity levels
 */
export const kafkaSeverityToLogMapping = [
  'fatal', 'fatal', 'fatal',
  'error', 'warn', 'info', 'info', 'debug',
]

/**
 * Convert syslog level to generic level
 * @param level syslog level
 */
export function getLogFnName(level: number): string {
  return kafkaSeverityToLogMapping[level] || 'debug'
}

/**
 * Checks whether topics exist
 * @param data - List of topics received on Client.connect
 * @param topics - Required topics
 */
export function topicExists(data: TopicInfo[], topics: string | string[]): boolean {
  const topicList = Array.isArray(topics) ? topics : [topics]
  const filtered = filter(data, topic => topicList.includes(topic.name))

  return filtered.length === topicList.length
}
