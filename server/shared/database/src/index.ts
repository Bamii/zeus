import { Token } from 'typedi'
import { Prisma } from './impl/prisma'
import { Database } from './models'
import * as dotenv from 'dotenv'
import 'reflect-metadata'
import UserRepository from './repos/user'
import DevicesRepository from './repos/devices'
import ConfigRepository from './repos/configs'
import KeyRepository from './repos/key'
dotenv.config()

// this structure is very much up for debate...
const databases: Record<string, typeof Database> = {
    prisma: Prisma,
} as const

type DatabaseName = keyof typeof databases
type FactorySettings = {
    database: DatabaseName
    connection_string?: string
}

function DatabaseFactory({ database = 'prisma' }: FactorySettings) {
    return databases[database] as Token<Database>
}

export { UserRepository, DevicesRepository, ConfigRepository, KeyRepository }

export default (function () {
    return DatabaseFactory({ database: 'prisma' })
})()
