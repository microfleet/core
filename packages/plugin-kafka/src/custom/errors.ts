import { CODES as KafkaCodes } from './rdkafka-extra'
import { helpers as ErrorHelpers } from 'common-errors'
import { TimeoutError } from 'bluebird'
import { TopicPartitionOffset } from 'node-rdkafka'
import type { CommitOffsetTracker } from './consumer-stream'

const { ERRORS: KafkaErrorCodes } = KafkaCodes
const {
  ERR__ASSIGN_PARTITIONS,
  ERR__REVOKE_PARTITIONS,
  ERR_UNKNOWN_MEMBER_ID,
  ERR_UNKNOWN_TOPIC_OR_PART,
  ERR__STATE,
  ERR_UNKNOWN,
  ERR_REQUEST_TIMED_OUT,
} = KafkaErrorCodes

interface CommonError {
  inner_error: number | Error;
  message: string;
}

export const TopicNotFoundError = ErrorHelpers.generateClass('TopicNotFoundError', {
  args: ['message', 'topics'],
})

export const OffsetCommitError = ErrorHelpers.generateClass('OffsetCommitError', {
  args: ['partitions', 'inner_error'],
  generateMessage(this: CommonError) {
    if (typeof this.inner_error === 'number') {
      return `Kafka critical error: ${this.inner_error}`
    }
    return `Kafka critical error: ${this.inner_error.message}`
  },
})

export interface OffsetCommitError extends CommonError{
  partitions: TopicPartitionOffset[];
}

export const UncommittedOffsetsError = ErrorHelpers.generateClass('UncommittedOffsetsError', {
  args: ['offsetTracker', 'unacknowledgedTracker'],
  generateMessage: () => 'Uncomitted offsets left',
})

export interface OffsetCommitError extends CommonError{
  offsetTracker: CommitOffsetTracker;
  unacknodledgedTracker: CommitOffsetTracker;
}

export const CriticalErrors: number[] = [
  ERR_UNKNOWN_MEMBER_ID,
  ERR_UNKNOWN_TOPIC_OR_PART,
]

export const RetryableErrors: number[] = [
  ERR_REQUEST_TIMED_OUT
]

export const Generic = {
  ERR__ASSIGN_PARTITIONS,
  ERR__REVOKE_PARTITIONS,
  ERR__STATE,
  ERR_UNKNOWN,
}

export const CommitTimeoutError = new TimeoutError('offset commit timeout on shutdown')

export const TopicWaitError = ErrorHelpers.generateClass('TopicWaitError', {
  args: ['message', 'retryConfig', 'retryState'],
})
