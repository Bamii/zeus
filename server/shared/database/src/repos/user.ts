import { Service, Container } from 'typedi'
import { Database, User } from '../models/index'
import { Prisma } from '@prisma/client'
//import { Prisma } from '../impl/prisma'
//import Database from '../index'

@Service()
export default class UserRepository {
    database: Database
    constructor() {
        this.database = Container.get('prisma.database')
    }

    getUser(find: Partial<User>) {
        return this.database.getClient().user.findUnique({
            where: find,
            include: { key: true, config: true, devices: true },
        })
    }

    async createUser(user: Prisma.UserCreateInput) {
        //console.log(this.database)
        return this.database.getClient().user.create({ data: user })
    }
}
