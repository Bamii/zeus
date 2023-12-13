import { Queue } from '../index'
import log from 'logger'
import { Service } from 'typedi'
import { Redis as RedisClient } from 'ioredis'
import _config from 'config'
const config = _config.queue

@Service()
export default class Redis implements Queue {
    client: RedisClient | null = null
    consuming: boolean = false

    constructor() {
        this.connect()
    }

    async connect(): Promise<this> {
        return new Promise((resolve, reject) => {
            try {
                this.client = new RedisClient(config.connection_url)
                resolve(this)
            } catch (error: any) {
                log.error(error.message)
                reject('err')
            }
        })
    }

    async enqueue(
        queue: string,
        { topic, value }: { topic: string; value: string }
    ): Promise<void> {
        if (!this.client) return
        try {
            await this.client.xadd(
                `${queue}:${topic ?? ''}`,
                '*',
                'value',
                value
            )
        } catch (error: any) {
            log.error(error.message)
            throw error
        }
    }

    async dequeue<U>(
        queue: string,
        { topic }: { topic: string; total?: any }
    ): Promise<U | null> {
        try {
            const queueName = `${queue}:${topic ?? ''}`
            let response = await this.client?.xread(
                'COUNT',
                1,
                'BLOCK',
                2000,
                'STREAMS',
                queueName,
                0
            )
            if (!response) return null

            const id = response?.[0]?.[1]?.[0]?.[0]
            if (!id) return null

            const value = response?.[0]?.[1]?.[0]?.[1]?.[1]
            // should maybe have a retry queue??
            const del = await this.client?.xdel(queueName, id)
            log.info(`dequeued ${del} from the queue.`)
            return value as U
        } catch (error: any) {
            log.error(error.message)
            throw new Error('an error occurred while dequeueing')
        }
    }

    async dequeueItem(
        queue: string,
        position: string,
        options: { topic: string }
    ): Promise<string> {
        try {
            const queueName = `${queue}:${options.topic}`
            const list = await this.getQueue(queue, options)
            log.info(list)
            let found

            // TODO:: move this routine to the redis engine...
            for (let i of list) {
                const [id, [, _value]] = i
                if (_value == position) {
                    found = id
                    break
                }
            }

            if (!found) throw new Error('did not find item on the stream list')

            await this.client?.xdel(queueName, found)
            return `${queue}.${position}`
        } catch (error: any) {
            log.error('error occurred while dequeueing at position.')
            throw error
        }
    }

    async getQueue(queue: string, options: { topic: string }): Promise<any[]> {
        try {
            const queueName = `${queue}:${options.topic ?? ''}`
            const length = await this.length(queue, { topic: options.topic })
            const list = await this.client?.xread(
                'COUNT',
                length,
                'BLOCK',
                5000,
                'STREAMS',
                queueName,
                0
            )

            return list?.[0]?.[1] ?? []
        } catch (error: any) {
            log.error('an error occured while getting index of item from queue')
            throw error
        }
    }

    async getIndexOf(
        queue: string,
        value: string,
        options: { topic: string }
    ): Promise<number> {
        try {
            const list = await this.getQueue(queue, options)
            let found = -1

            for (let i = 0; i < list.length; i++) {
                const [, [, _value]] = list[i]
                if (value === _value) {
                    found = i + 1
                    break
                }
            }

            return found
        } catch (error: any) {
            log.error('an error occured while getting index of item from queue')
            throw error
        }
    }

    async length(
        queue: string,
        _options: { read?: number; topic?: string }
    ): Promise<number> {
        try {
            const options = { read: 0, topic: '', ..._options }
            const queueName = `${queue}:${options.topic}`
            const length = await this.client?.xlen(queueName)
            if (length == undefined) throw new Error('This queue is invalid :(')

            return Math.abs(options?.read - length)
        } catch (error: any) {
            throw new Error(error.message)
        }
    }
}
