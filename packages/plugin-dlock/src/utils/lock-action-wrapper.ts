import { Microfleet, ServiceRequest, ServiceAction } from '@microfleet/core-types'
import Bluebird from 'bluebird'
import { LockAcquisitionError } from 'ioredis-lock'
import { HttpStatusError } from 'common-errors'

export type RequestMapper = {
  (request: ServiceRequest): string;
}

const concurrentRequests = new HttpStatusError(429, 'multiple concurrent requests')

function acquireLockWrapper(
  this: Microfleet,
  request: ServiceRequest,
  action: ServiceAction,
  lockKeyPrefix: string,
  lockKeySuffixes: RequestMapper[] = []
) {
  const keyParts = [lockKeyPrefix]

  for (const mapper of lockKeySuffixes) {
    keyParts.push(mapper(request))
  }

  const lock = this.acquireLock(keyParts.join('-'))

  return Bluebird
    .using(this, request, lock, () => action.call(this, request, lock))
    .catchThrow(LockAcquisitionError, concurrentRequests)
}

export default (
  action: ServiceAction,
  lockKeyPrefix: string,
  lockKeySuffixes: RequestMapper[]
) => function actionLockWrapper(this: Microfleet, request: ServiceRequest): Promise<any> {
  return acquireLockWrapper.call(this, request, action, lockKeyPrefix, lockKeySuffixes)
}
