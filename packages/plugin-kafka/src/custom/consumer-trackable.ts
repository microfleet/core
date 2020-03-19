import { Readable } from 'stream'
import * as assert from 'assert'

import * as debug from 'debug'
const log = debug('kafka:wrapper-stream')

import {
  KafkaConsumer, KafkaConsumerStream, ConsumerStream as IConsumerStream, Client,
  CODES, TopicPartition
} from '../rdkafka-extra'
import { ConsumerStreamOptions } from '../types'

const kafkaErrorCodes = CODES.ERRORS

export class TrackableConsumerStream extends Readable {
  public consumer: KafkaConsumer
  public stream: IConsumerStream
  private config: ConsumerStreamOptions

  private partitionsAssigned: boolean
  private commits: {
    [topicPartition: string]: number
  }

  /**
   * @param consumer Connected kafka consumer
   * @param config Topic configuration
   */
  constructor(consumer: Client, config: ConsumerStreamOptions) {
    assert(consumer.isConnected(), 'consumer should be connected')
    assert(consumer instanceof KafkaConsumer, 'should be intance of KafkaConsumer')

    const fetchSize = (config.fetchSize || 1)
    const highWaterMark = config.objectMode === true ? fetchSize + 2 : fetchSize

    super({
      highWaterMark,
      objectMode: config.objectMode,
    })

    this.commits = Object.create(null)
    this.partitionsAssigned = false
    this.consumer = consumer as KafkaConsumer
    this.config = config

    const stream = this.stream = new KafkaConsumerStream(consumer, config)

    consumer.on('offset.commit', this.handleCommitDelivery.bind(this))
    consumer.on('rebalance', this.handleRebalance.bind(this))

    stream.on('error', (e: Error) => {
      log('GOT ERROR FROM SUBSTREAM')
      this.destroy(e)
    })

    stream.once('close', () => {
      log('GOT CLOSE FROM SUBSTREAM')
      this.close()
    })

    stream.on('data', (chunk: any) => {
      const pushRes = this.config.objectMode === true ? this.push(chunk) : this.push(chunk.value)
      if (!pushRes) this.stream.pause()
    })
  }

  public handleRebalance(err: any, assignments: TopicPartition[]) {
    log('REBALANCE', err, assignments)
    if (err.code === kafkaErrorCodes.ERR__ASSIGN_PARTITIONS) {
      this.partitionsAssigned = true
      this.commits = assignments.reduce<any>(
        (prev, assignment) => {
          prev[`${assignment.topic}_${assignment.partition}`] = -1001
          return prev
        },
        Object.create(null)
      )
      log('REBALANCE ASSIGN COMMITS', this.commits)
    }

    if (err.code === kafkaErrorCodes.ERR__REVOKE_PARTITIONS) {
      assignments.forEach((assignment) => {
        delete this.commits[`${assignment.topic}_${assignment.partition}`]
      })

      if (Object.keys(this.commits).length === 0) {
        this.partitionsAssigned = false
      }
      log('REBALANCE REVOKE COMMITS', this.commits)
    }
  }

  public handleCommitDelivery(err: Error, msgs: any): void {
    log('offset.commit', err, msgs)

    if (err) return

    for (const msg of msgs) {
      const commitIndexKey = `${msg.topic}_${msg.partition}`

      if (this.commits[commitIndexKey] < msg.offset) {
        this.commits[commitIndexKey] = msg.offset
      }
    }

    log('offset.commit result', this.commits)

    // dupl
    if (this.checkOffsets()) {
      log('offset.commit _READ DONE')
      this.push(null)
      return
    }
  }

  public checkOffsets(): boolean {
    const { consumer } = this
    const assignments = consumer.assignments()

    if (!this.partitionsAssigned) return false

    const localOffsets = assignments.map(
      (assignment: TopicPartition) => ({
        ...{
          topic: assignment.topic,
          partition: assignment.partition,
        },
        ...consumer.getWatermarkOffsets(assignment.topic, assignment.partition),
      })
    )

    const allAssignmentStatus = localOffsets.map((localPartitionInfo: any) => {
      const { highOffset } = localPartitionInfo
      const lastCommitedOffset = this.commits[`${localPartitionInfo.topic}_${localPartitionInfo.partition}`]
      // (offset || 0) - partition assigned but has no data
      // TODO
      return lastCommitedOffset ? highOffset === (lastCommitedOffset || 0) : false
    })

    log('checkOffsets', allAssignmentStatus, assignments, localOffsets, this.commits)

    return !allAssignmentStatus.includes(false)
  }

  // tslint:disable-next-line: function-name
  public _destroy(error: Error | null, callback: (error?: Error | null | undefined) => void): void {
    if (! this.stream.destroyed) {
      this.stream.destroy(error || undefined)
    }
    callback(error)
  }

  // tslint:disable-next-line: function-name
  public _read(_: number): void {
    log('_READ')
    if (this.stream.messages.length > 0) return

    if (this.checkOffsets() && this.partitionsAssigned) {
      log('_READ DONE')
      this.push(null)
      return
    }

    log('_READ RESUME')
    this.stream.resume()
  }

  public async close(): Promise<any> {
    await this.stream.closeAsync()
    this.emit('close')
  }

  public async closeAsync(): Promise<any> {
    return this.close()
  }
}
