import { Cache } from '../index'
import log from "logger";
import { Redis as RedisClient } from 'ioredis';
import { Service } from "typedi";
import _config from "config";
const config = _config.queue;

@Service()
export default class Redis implements Cache {
  client: RedisClient | null = null;

  constructor() {
    this.connect();
    log.info("[cache] connecting to redis instance");
  }

  async connect(): Promise<this> {
    return new Promise((resolve, reject) => {
      try {
        this.client = new RedisClient(config.connection_url);
        resolve(this)
      } catch (error: any) {
        log.error(error.message);
        reject('err')
      }
    })
  }

  async insert(topic: string, object: { key: string, value: string }): Promise<void> {
    if (!this.client) return;
    try {
      log.info(`inserting into: ${topic} : ${ JSON.stringify(object)}`) 
      await this.client.hset(topic, { [object.key]: object.value });
    } catch (error: any) {
      log.error(error.message);
    }
  }

  async get(topic: string, key: string): Promise<string | null> {
    if (!this.client) return null;
    try {
      log.info(`getting key from: ${topic} : ${key}`) 
      const value = await this.client.hget(topic, key)
      log.info(`value is ${value}`);
      return value;
    } catch (error: any) {
      log.error(error.message);
      throw new Error("")
    }
  }

  async invalidateKeys(topic: string, keys: string[]): Promise<void> {
    if (!this.client) return;
    try {
      log.info(`invalidating keys from: ${topic} : ${keys}`)
      await this.client.hdel(topic, ...keys)
    } catch (error: any) {
      log.error(error.message);
    }
  }

  async invalidateAllKeys(topic: string): Promise<void> {
    if (!this.client) return;
    try {
      log.info(`invalidaating all keys from: ${topic}`);
      await this.client.del(topic)
    } catch (error: any) {      
      log.error(error.message);
    }
  }
}

