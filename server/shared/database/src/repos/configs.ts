import Container, { Service } from 'typedi'
import { Config, Database } from '../models/index'

@Service()
export default class ConfigRepository {
    database: Database
    constructor() {
        this.database = Container.get('prisma.database')
    }

    async getConfig(find: Partial<Config>) {
        return this.database.getClient().config.findUnique({ where: find })
    }

    async createConfig(user: Omit<Config, 'id'>) {
        await this.database.getClient().config.create({ data: user })
    }

    async updateConfigForUser(user_id: string, data: Partial<Config>) {
        const config = await this.getConfig({ user_id: `${user_id}` })
        if (!config) {
            await this.createConfig({ user_id: `${user_id}`, hash: data.hash! })
            return
        }

        await this.database.getClient().config.updateMany({
            data,
            where: { user_id: `${user_id}` },
        })
    }
}
