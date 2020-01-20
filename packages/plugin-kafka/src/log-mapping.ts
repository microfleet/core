// rdkafka uses syslog severity values.
export const kafkaSeverityToLogMapping = [
  'fatal', 'fatal', 'fatal',
  'error', 'warn', 'info', 'info', 'debug',
]
export function getLogFnName(level: number): string {
  return kafkaSeverityToLogMapping[level] || 'debug'
}
