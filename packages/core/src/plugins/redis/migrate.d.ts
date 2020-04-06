import { Microfleet } from '../..';
import Redis = require('ioredis');
export interface Migration {
    final: number;
    min: number;
    args: any[];
    script: any;
    keys?: string[];
}
/**
 * Perform migrations on the Redis database.
 * @param  redis - Redis client.
 * @param  service - Mservice instance.
 * @param  scripts - Migrations to perform.
 * @returns Returns when migrations are performed.
 */
declare function performMigration(redis: Redis.Redis, service: Microfleet, scripts: any): Promise<true | undefined>;
export default performMigration;
