import { Database } from '../models'
import { PrismaClient } from '@prisma/client'
import log from 'logger'
import { Service } from 'typedi'

@Service('prisma.database')
export class Prisma extends Database {
    constructor() {
        super()
        this.connect()
    }

    getClient(): PrismaClient {
        return this.client
    }

    connect(): Database {
        try {
            this.client = new PrismaClient()
            log.info('connected to database.')
            return this
        } catch (error: any) {
            throw new Error(error.message)
        }
    }

    async transaction(...args: Promise<Function>[]): Promise<void> {
        try {
            await this.client?.$transaction(args)
        } catch (error: any) {
            throw new Error(error.message)
        }
    }
}
