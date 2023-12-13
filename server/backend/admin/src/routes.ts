import { Router, Response, NextFunction } from 'express'
import log from 'logger'
import { Container } from 'typedi'
import DatabaseInstance from 'database'
import QueueInstance from 'queue'
import { sendError, sendSuccess, hash256 } from 'expressapp/src/utils'
import { User, Config, Device } from 'database/src/models'
import {
    UserRepository,
    ConfigRepository,
    DevicesRepository,
} from 'database/src'
import { ApplicationError } from 'config'
//import { extract, adminAuth, comparePassword, hashPassword, signJWT } from "auth"
import * as validator from './middleware'
import CacheInstance from 'cache'
import StorageInstance from 'storage'
import { Unkey } from '@unkey/api'
import { apiKeyAuth, isDeviceRegistered } from 'auth'
import fs from 'fs/promises'

const unkey = new Unkey({ rootKey: 'unkey_3ZnyCB4BHxHbJbvfaWSihqRX' })
const router = Router()
//const queue = Container.get(QueueInstance)
//const cache = Container.get(CacheInstance)
const storage = Container.get(StorageInstance)
const userRepository = Container.get(UserRepository)
const configRepository = Container.get(ConfigRepository)
const devicesRepository = Container.get(DevicesRepository)

// onboard...
router.post('/register', validator.registerUser, async (_req, res, next) => {
    try {
        let user = await userRepository.getUser({ email: _req.body.email })

        if (user) return sendError(res, "There's a user with that email.")

        user = await userRepository.createUser(_req.body)

        const created = await unkey.keys.create({
            apiId: 'api_8qR9AiEBdvrUCAuES4q569',
            byteLength: 16,
            ownerId: `${user.id}`,
            meta: {},
        })

        // save the key.
        console.log(created)
        console.log(user)

        return sendSuccess(res, 'something is up')
    } catch (error: any) {
        console.log(error)
        return sendError(res, 'An Error Occured')
    }
})

// admin logins...
router.post('/login', validator.loginValidator, async (req, res, next) => {
    try {
        let user = await userRepository.getUser({ email: req.body.email })

        if (!user)
            return sendError(res, "There's no user with that email.", {
                status: 401,
            })

        // save the key.
        console.log(user)

        return sendSuccess(res, 'something is up')
    } catch (error: any) {
        console.log(error)
        return sendError(res, 'An Error Occured')
    }
})

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
            const userid = req.user.id
            const config = await configRepository.getConfig({
                user_id: `${userid}`,
            })

            const file = atob(req.body.config)
            const hash = hash256(file)

            console.log(hash)
            console.log(config.hash)
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
            const userid = req.user.id
            const config = await configRepository.getConfig({
                user_id: `${userid}`,
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
