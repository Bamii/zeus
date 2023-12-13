import { Token } from 'typedi'
import RabbitMQ from './impl/rabbitmq.queue'
import Redis from './impl/redis'
import 'reflect-metadata'

export abstract class Queue {
    abstract connect(): Promise<this>

    abstract enqueue(
        queue: string,
        value: { topic?: string; value: string }
    ): Promise<void>

    abstract dequeue<U>(
        queue: string,
        options: { topic?: string }
    ): Promise<U | null>

    abstract dequeueItem(
        queue: string,
        value: string,
        options: { topic: string }
    ): Promise<string>

    abstract getQueue(queue: string, options: { topic: string }): Promise<any[]>

    abstract getIndexOf(
        queue: string,
        value: string,
        options: { topic: string }
    ): Promise<number>

    abstract length(
        queue: string,
        options: { read?: number; topic?: string }
    ): Promise<number>
}

// implementations...
const queues = {
    kafka: RabbitMQ as Token<Queue>,
    redis: Redis as Token<Queue>,
} as const
type QueueName = keyof typeof queues

type FactorySettings = {
    queue: QueueName
    connection_string?: string
}

function queueFactory({ queue = 'redis' }: FactorySettings) {
    return queues[queue]
}

export default (function () {
    return queueFactory({ queue: 'redis' })
})()
