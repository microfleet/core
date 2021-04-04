import assert = require('assert')
import { resolve } from 'path'
import retry = require('bluebird-retry')
import Errors = require('common-errors')
import Elasticsearch = require('@elastic/elasticsearch')
import { NotFoundError } from 'common-errors'
import { PluginTypes } from '@microfleet/utils'
import * as AWS from 'aws-sdk'
import { createAwsElasticsearchConnector } from './utils/createAwsElasticsearchConnector'
import { PluginInterface, Microfleet } from '@microfleet/core-types'

/* eslint-disable @typescript-eslint/no-unused-vars */
import type * as _ from '@microfleet/plugin-logger'
import type * as __ from '@microfleet/plugin-validator'
/* eslint-enable @typescript-eslint/no-unused-vars */

interface ElasticLogger {
  trace(...args: any[]): void;
  debug(...args: any[]): void;
  info(...args: any[]): void;
  warning(...args: any[]): void;
  error(...args: any[]): void;
  fatal(...args: any[]): void;
  close(...args: any[]): void;
}

export interface AWSElasticsearchConfig {
  node: string;
  accessKeyId: string;
  secretAccessKey: string;
  region?: string;
  log: any;
}

declare module '@microfleet/core-types' {
  interface Microfleet {
    awsElasticsearch: Elasticsearch.Client
  }

  interface ConfigurationOptional {
    awsElasticSearch: Config
  }
}

export interface Config {
  accessKeyId: string;
  secretAccessKey: string;
  node: string;
  region?: string;
}

/**
 * Relative priority inside the same plugin group type
 */
export const priority = 0
export const name = 'awsElasticsearch'
export const type = PluginTypes.database
export function attach(
  this: Microfleet,
  opts: Partial<AWSElasticsearchConfig> = {}
): PluginInterface {
  assert(
    this.hasPlugin('logger'),
    new NotFoundError('logger module must be included')
  )
  assert(
    this.hasPlugin('validator'),
    new NotFoundError('validator module must be included')
  )

  this.validator.addLocation(resolve(__dirname, '../schemas'))

  const conf = this.validator.ifError<AWSElasticsearchConfig>('awsElasticsearch', opts)

  const { log } = conf
  
  const { log: serviceLogger } = this

  let Logger: ElasticLogger | null = null
  if (log && log.type === 'service') {
    Logger = {
      debug: serviceLogger.debug.bind(serviceLogger),
      error: serviceLogger.error.bind(serviceLogger),
      info: serviceLogger.info.bind(serviceLogger),
      warning: serviceLogger.warn.bind(serviceLogger),
      trace(method, requestUrl, body, responseBody, responseStatus) {
        serviceLogger.trace({
          body,
          method,
          requestUrl,
          responseBody,
          responseStatus,
        })
      },
      close() { return },
    } as ElasticLogger
  }

  return {
    /**
     * @returns aws-elasticsearch connection.
     */
    async connect(this: Microfleet) {
      assert(
        !this.awsElasticsearch,
        new Errors.NotPermittedError('aws elasticsearch was already started')
      )

      const awsConfig = new AWS.Config({
        credentials: {
          accessKeyId: conf.accessKeyId,
          secretAccessKey: conf.secretAccessKey,
        },
        region: conf.region,
      })    

      const instance = new Elasticsearch.Client({
        ...createAwsElasticsearchConnector(awsConfig),
        node: conf.node,
        log: Logger || log,
      })

      await retry(instance.nodes.info, {
        context: instance.nodes,
        args: [{ nodeId: '', human: true }],
        interval: 500,
        backoff: 2,
        max_interval: 5000,
        timeout: 60000,
        max_tries: 100,
      })

      this.awsElasticsearch = instance
      this.emit('plugin:connect:awsElasticsearch', instance)
      return instance
    },

    /**
     * @returns Closes aws-elasticsearch connection.
     */
    async close(this: Microfleet) {
      await this.awsElasticsearch.close()
      this.emit('plugin:close:awsElasticsearch')
    },
  }
}
