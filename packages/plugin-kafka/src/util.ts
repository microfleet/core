import { TopicInfo } from 'node-rdkafka'

/**
 * `librdkafka` uses syslog severity levels
 */
export const kafkaSeverityToLogMapping: { [level: number]: string } = {
  0: 'fatal', 1: 'fatal',
  2: 'fatal', 3: 'error',
  4: 'warn', 5: 'info',
  6: 'info', 7: 'debug',
}

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
export function topicExists(data: TopicInfo[], topics: string | string[] | undefined): boolean {
  const topicList = Array.isArray(topics) ? topics : [topics]
  const filtered = data.filter(topic => topicList.includes(topic.name))

  return filtered.length === topicList.length
}
