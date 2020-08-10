import type { Redis } from 'ioredis'
import type { Logger } from '@microfleet/plugin-logger'

export type DLockConfig = {
  client: Redis;
  pubsub: Redis;
  pubsubChannel: string;
  lock: LockConfig;
  lockPrefix: string;
  log: false | Logger;
}

export type LockConfig = {
  timeout?: number;
  retries?: number;
  delay?: number;
}

export interface IORedisLock {
  acquire(key: string): Promise<void>;
  release(): Promise<void>;
  extend(time: number): Promise<void>;
}
