import { Router, Response } from 'express'
//import log from 'logger'
import { Container } from 'typedi'
//import QueueInstance from 'queue'
import { sendError, sendSuccess, hash256 } from 'expressapp/src/utils'
import { User } from 'database/src/models'
import { ConfigRepository, DevicesRepository } from 'database/src'
import * as validator from './middleware'
//import CacheInstance from 'cache'
import StorageInstance from 'storage'
import { apiKeyAuth, isDeviceRegistered } from 'auth'
import fs from 'fs/promises'

const router = Router()
//const cache = Container.get(CacheInstance)
const storage = Container.get(StorageInstance)
const configRepository = Container.get(ConfigRepository)
const devicesRepository = Container.get(DevicesRepository)

// link your laptop
router.post(
    '/link',
    apiKeyAuth,
    validator.linkDevice,
    async (req: any & { user: User }, res: any, next: any) => {
        try {
            const device = await devicesRepository.getDevice({
                fingerprint: req.body.fingerprint,
            })

            if (device)
                return sendError(
                    res,
                    'respectfully, sir/ma... you have already linked this device.'
                )

            const devices = await devicesRepository.getUsersDevices(req.user.id)
            if (devices.length > 3) {
                return sendError(
                    res,
                    'you already have 3 devices mate. please buy a subscription. saanu mi'
                )
            }

            await devicesRepository.createDevice({
                ...req.body,
                user_id: `${req.user.id}`,
            })

            return sendSuccess(res, 'successfully added this device.')
        } catch (error: any) {
            console.log(error)
            return sendError(res, 'an error Occured', { status: 500 })
        }
    }
)

router.post(
    '/config/latest',
    apiKeyAuth,
    validator.updateLatestConfig,
    validator.deviceIdentifier,
    isDeviceRegistered,
    async (req: any & { user: User }, res: Response) => {
        try {
            const userid = parseInt(req.user.id)
            const config = await configRepository.getConfig({
                user_id: userid,
            })

            const file = atob(req.body.config)
            const hash = hash256(file)

            if (hash === config?.hash) {
                return sendError(res, 'file already uploaded', { status: 500 })
            }

            await storage.upload(`${userid}.config.yaml`, file)

            await configRepository.updateConfigForUser(userid, { hash })

            return sendSuccess(res, 'yayy! upload success')
        } catch (error) {
            console.log(error)
            return sendError(res, 'an error occured', { status: 500 })
        }
    }
)

// get the most recent config for user.
router.get(
    '/config/latest',
    apiKeyAuth,
    validator.getLatestConfig,
    validator.deviceIdentifier,
    isDeviceRegistered,
    async (req: any & { user: User }, res: Response) => {
        try {
            const userid = parseInt(req.user.id)
            const config = await configRepository.getConfig({
                user_id: userid,
            })

            if (!config)
                return sendError(
                    res,
                    'you currently have not uploaded any config.'
                )

            if (config?.hash === req.body?.current_version) {
                return sendError(res, 'you already have the latest config')
            }

            const filename = `${userid}.config.yaml`
            const config_blob: Blob = await storage.download(filename)
            const content = await config_blob.arrayBuffer()

            //console.log(hash256(content))
            console.log(config_blob)
            await fs.writeFile('/config.yaml', new DataView(content))

            res.sendFile('/config.yaml')

            //await fs.unlink('config.yaml')
            return
        } catch (error) {
            console.log(error)
            return sendError(res, 'an error Occured', { status: 500 })
        }
    }
)

export default router
