import Container, { Service } from 'typedi'
import { Device, Database } from '../models/index'

@Service()
export default class DevicesRepository {
    database: Database
    constructor() {
        this.database = Container.get('prisma.database')
    }

    getDevice(find: Partial<Device>) {
        return this.database.getClient().device.findUnique({ where: find })
    }

    async createDevice(device: Device) {
        await this.database.getClient().device.create({ data: device })
    }

    async getUsersDevices(user: string) {
        return this.database
            .getClient()
            .device.findMany({ where: { user_id: `${user}` } })
    }

    async getUsersDevice(user: string, fingerprint: string) {
        return this.database
            .getClient()
            .device.findMany({ where: { user_id: `${user}`, fingerprint } })
    }
}
