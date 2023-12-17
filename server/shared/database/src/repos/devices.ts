import Container, { Service } from 'typedi'
import { Device, Database } from '../models/index'
import { Prisma } from '@prisma/client'

@Service()
export default class DevicesRepository {
    database: Database
    constructor() {
        this.database = Container.get('prisma.database')
    }

    getDevice(find: Partial<Device>) {
        return this.database.getClient().device.findUnique({ where: find })
    }

    async createDevice({
        user_id,
        id,
        ...device
    }: Prisma.DeviceCreateManyInput) {
        await this.database.getClient().device.create({
            data: { ...device, user: { connect: { id: user_id } } },
        })
    }

    async getUsersDevices(user: number) {
        return this.database
            .getClient()
            .device.findMany({ where: { user_id: user } })
    }

    async getUsersDevice(user: number, fingerprint: string) {
        return (
            (
                await this.database.getClient().device.findMany({
                    where: { user_id: user, fingerprint },
                })
            )[0] ?? null
        )
    }
}
