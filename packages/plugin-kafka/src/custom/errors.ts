import { CODES as KafkaCodes } from './rdkafka-extra'
import { helpers as ErrorHelpers } from 'common-errors'
import { TimeoutError } from 'bluebird'
import { TopicPartitionOffset, SubscribeTopicList } from '@makeomatic/node-rdkafka'
import { Options as RetryOptions } from 'bluebird-retry'
import type { TrackerMeta } from './consumer-stream'

const { ERRORS: KafkaErrorCodes } = KafkaCodes
const {
  ERR__ASSIGN_PARTITIONS,
  ERR__REVOKE_PARTITIONS,
  ERR_UNKNOWN_MEMBER_ID,
  ERR_UNKNOWN_TOPIC_OR_PART,
  ERR__STATE,
  ERR_UNKNOWN,
  ERR_REQUEST_TIMED_OUT,
  ERR_NETWORK_EXCEPTION,
  ERR__WAIT_COORD,
  ERR_COORDINATOR_LOAD_IN_PROGRESS,
  ERR_GROUP_LOAD_IN_PROGRESS,
  ERR_PREFERRED_LEADER_NOT_AVAILABLE,
} = KafkaErrorCodes

interface CommonError {
  inner_error: number | Error;
  message: string;
}

export const TopicNotFoundError = ErrorHelpers.generateClass('TopicNotFoundError', {
  args: ['message', 'topics'],
}) as TopicNotFoundError

export type TopicNotFoundError = CommonError & {
  new (message: string, topics: SubscribeTopicList): TopicNotFoundError;
  topics: SubscribeTopicList;
}

export const OffsetCommitError = ErrorHelpers.generateClass('OffsetCommitError', {
  args: ['partitions', 'trackerMeta', 'inner_error'],
  generateMessage(this: CommonError) {
    if (typeof this.inner_error === 'number') {
      return `Kafka critical error: ${this.inner_error}`
    }
    return `Kafka critical error: ${this.inner_error.message}`
  },
  globalize: true
}) as OffsetCommitError

export type OffsetCommitError = CommonError & {
  new (partitions: TopicPartitionOffset[], meta: TrackerMeta, inner_error: Error): OffsetCommitError;
  partitions: TopicPartitionOffset[];
  trackerMeta: TrackerMeta;
  inner_error: Error;
}

export const UncommittedOffsetsError = ErrorHelpers.generateClass('UncommittedOffsetsError', {
  args: ['offsetTracker', 'unacknowledgedTracker'],
  generateMessage: () => 'Uncomitted offsets left',
}) as UncommittedOffsetsError

export type UncommittedOffsetsError = CommonError & {
  new(offsetTracker: { [k: string]: TopicPartitionOffset }, unacknowledgedTracker: { [k: string]: TopicPartitionOffset }): UncommittedOffsetsError;
  offsetTracker: { [k: string]: TopicPartitionOffset };
  unacknowledgedTracker: { [k: string]: TopicPartitionOffset };
}

export const CriticalErrors: number[] = [
  ERR_UNKNOWN_MEMBER_ID,
  ERR_UNKNOWN_TOPIC_OR_PART,
]

export const RetryableErrors: number[] = [
  ERR_NETWORK_EXCEPTION,
  ERR_COORDINATOR_LOAD_IN_PROGRESS,
  ERR__WAIT_COORD,
  ERR_GROUP_LOAD_IN_PROGRESS,
  ERR_PREFERRED_LEADER_NOT_AVAILABLE,
  ERR_REQUEST_TIMED_OUT
]

export const Generic = {
  ERR__ASSIGN_PARTITIONS,
  ERR__REVOKE_PARTITIONS,
  ERR__STATE,
  ERR_UNKNOWN,
  ERR_UNKNOWN_TOPIC_OR_PART
}

export const CommitTimeoutError = new TimeoutError('offset commit timeout on shutdown')

export const TopicWaitError = ErrorHelpers.generateClass('TopicWaitError', {
  args: ['message', 'retryConfig', 'retryState'],
}) as TopicWaitError

export type TopicWaitError = CommonError & {
  new(message: string, retryConfig: RetryOptions | undefined, retryState: { attempts: number, operation: string }): TopicWaitError;
  retryConfig: RetryOptions;
  retryState: { attempts: number, operation: string };
}
