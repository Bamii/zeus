import { PrismaClient } from '@prisma/client'

export abstract class Repository<T> {
    abstract get(): T
    abstract getById(): T
    abstract insert(): T
    abstract update(): T
    abstract delete(): T
}

export abstract class Database {
    abstract connect(): Database

    protected client: any

    abstract getClient(): PrismaClient

    abstract transaction(...args: Promise<any>[]): Promise<void>
}

export type User = {
    id: number
    name: string
    email: string
    password: string
    key?: Key
    config?: Config
    devices?: Device[]
}

export type Device = {
    id: number
    user_id: number
    user?: User
    fingerprint: string
    platform: string
}

export type Config = {
    id: number
    user_id: number
    user?: User
    hash: string
}

export type Key = {
    id: number
    key: string
    key_id: string
    user_id: number
    user?: User
}
