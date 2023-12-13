import { Token } from "typedi";
import Redis from "./impl/redis";
import 'reflect-metadata';

export abstract class Cache {
  abstract connect(): Promise<this>
  abstract get(topic: string, key: string): Promise<string | null>
  abstract insert(topic: string, object: { key: string, value: string }): void
  abstract invalidateKeys(topic: string, keys: string[]): void
  abstract invalidateAllKeys(topic: string): void
}

// implementations...
const caches = {
  "redis": Redis
} as const;

type CacheName = keyof typeof caches;
type FactorySettings = {
  cache: CacheName;
  connection_string?: string;
}

function cacheFactory({ cache = "redis" }: FactorySettings) {
  return caches[cache] as Token<Cache>;
}

export default (function() {
  return cacheFactory({ cache: "redis" });
})();

