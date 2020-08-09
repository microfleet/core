import { Redis, Cluster } from 'ioredis'

export interface RedisPlugin {
  redis: Redis | Cluster;
  redisType: 'redisCluster' | 'redisSentinel';
  redisDuplicate(): Redis | Cluster;
}
