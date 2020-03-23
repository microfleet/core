import { helpers as ErrorHelpers } from 'common-errors'

export const TopicNotFoundError = ErrorHelpers.generateClass('TopicNotFoundError', {
  args: ['message', 'topics'],
})

export const TopicReadTimeoutError = ErrorHelpers.generateClass('TopicReadTimeoutError', {
  args: ['message'],
})

export * from './node-rdkafka.d'
export * from './microfleet.d'
