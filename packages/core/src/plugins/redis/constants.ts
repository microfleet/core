import { ConnectionError, NotPermittedError } from 'common-errors'

export const ERROR_NOT_STARTED = new NotPermittedError('redis was not started')
export const ERROR_NOT_HEALTHY = new ConnectionError('redis connection is not healthy')
export const ERROR_ALREADY_STARTED = new NotPermittedError('redis was already started')

export const REDIS_TYPE_CLUSTER = 'redisCluster'
export const REDIS_TYPE_SENTINEL = 'redisSentinel'
