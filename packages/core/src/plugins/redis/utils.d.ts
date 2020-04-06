import { Microfleet } from '../..';
/**
 * Loads LUA script and defines it on the redis instance.
 * @param dir - Directory to scan for LUA scripts to load.
 * @param redis - Redis connector instance.
 */
export declare function loadLuaScripts(ctx: Microfleet, dir: string | string[], redis: any): Promise<void>;
export declare function isStarted(service: Microfleet, RedisType: any): () => boolean;
export declare function hasConnection(this: Microfleet, hasRedis: () => any): Promise<boolean>;
