import { Service, Container } from 'typedi'
import { Database, Key } from '../models/index'
import { Prisma } from '@prisma/client'
//import { Prisma } from '../impl/prisma'
//import Database from '../index'

@Service()
export default class KeyRepository {
    database: Database
    constructor() {
        this.database = Container.get('prisma.database')
    }

    getKey(find: Partial<Key>) {
        return this.database.getClient().key.findUnique({ where: find })
    }

    async create(user: Prisma.KeyCreateManyInput) {
        return this.database.getClient().key.create({ data: user })
    }
}
