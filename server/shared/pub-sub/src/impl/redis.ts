import { PubSub } from '../index'
import QueueImpl from 'queue';
import log from "logger";
import { Container, Service } from "typedi";

@Service()
export default class Redis implements PubSub {
  consuming: boolean = false;
  queue = Container.get(QueueImpl);

  // constructor(public queue: Rediss) {}

  async publish<T>(topic: string, value: T): Promise<void> {
    log.info(value);
    this.queue.enqueue(topic, { topic: "", value: "" })
  }

  async subscribe(topic: string, callback: Function | Awaited<Function>): Promise<void> {
    this.consume(topic, callback);
  }
  
  async consume(topic: string, callback: Function | Awaited<Function>): Promise<void> {
    this.consuming = true;
    while (this.consuming) {
      try {
        let res = await this.queue.dequeue(topic, { topic: "" });
        log.info(res);
        if (res)
          await callback(res);
      } catch (error: any) {
        // append to retry queue. 
        log.error(error.message)
      }
    }
  }
}

