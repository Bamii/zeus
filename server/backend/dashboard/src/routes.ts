import pug from 'pug'
import { Router, Response } from 'express'
import {
    UserRepository,
    ConfigRepository,
    DevicesRepository,
    KeyRepository,
} from 'database/src'
import Container from 'typedi'
import StorageInstance from 'storage'
import * as validator from './middleware'
import { User } from 'database/src/models'
import { clientAuth, comparePassword, hashPassword, signJWT } from 'auth'
import { sendError, sendSuccess, hash256 } from 'expressapp/src/utils'
import { Unkey } from '@unkey/api'
import { apiKeyAuth, isDeviceRegistered } from 'auth'
import fs from 'fs/promises'

const UNKEY_ROOTKEY = process.env.UNKEY_ROOTKEY
const UNKEY_APIKEY = process.env.UNKEY_APIKEY

const unkey = new Unkey({ rootKey: UNKEY_ROOTKEY })
const router = Router()
//const cache = Container.get(CacheInstance);
const userRepository = Container.get(UserRepository)
const keyRepository = Container.get(KeyRepository)
const storage = Container.get(StorageInstance)
const configRepository = Container.get(ConfigRepository)
const devicesRepository = Container.get(DevicesRepository)

router.get('/', clientAuth({ passthrough: true }), (req: any & User, res) => {
    res.render('index', { auth: !!req.user })
})

router.get(
    '/login',
    clientAuth({ passthrough: true }),
    (req: any & User, res) => {
        res.render('login', { auth: !!req.user })
    }
)

router.get(
    '/signup',
    clientAuth({ passthrough: true }),
    (req: any & User, res) => {
        res.render('signup', { auth: !!req.user })
    }
)

router.get(
    '/logout',
    clientAuth({ passthrough: true }),
    (req: any & User, res) => {
        res.cookie('authorization', '', {
            maxAge: -1000,
            httpOnly: true,
        })
        res.setHeader('HX-Redirect', '/')
        res.send('')
    }
)

router.get(
    '/download',
    clientAuth({ passthrough: true }),
    async (req: any, res: any) => {
        try {
            res.render('download', {
                windows_download_link:
                    'https://zeus-bkt.s3.amazonaws.com/artifacts/zeus.windows.zip',
                linux_download_link:
                    'https://zeus-bkt.s3.amazonaws.com/artifacts/zeus.linux.zip',
                macos_download_link:
                    'https://zeus-bkt.s3.amazonaws.com/artifacts/zeus.macos.zip',
                auth: !!req.user,
            })
        } catch (e: any) {}
    }
)

router.get(
    '/dashboard',
    clientAuth({ redirect: true }),
    async (req: any & User, res) => {
        try {
            const email = req.user?.email
            const user = await userRepository.getUser({ email })

            res.render('dashboard', {
                user,
                auth: true,
            })
        } catch (error) {
            console.log(error)
        }
    }
)

router.post('/login', validator.login, async (req: any & User, res) => {
    let user = await userRepository.getUser({ email: req.body.email })

    if (!user) {
        const content = pug.compileFile('views/includes/notification.pug')
        return res.send(content({ text: "There's no user with that email." }))
    }

    const comparison = await comparePassword({
        hashedPassword: user.password,
        password: req.body.password,
    })

    if (!comparison) {
        const content = pug.compileFile('views/includes/notification.pug')
        return res.send(content({ text: 'invalid login combination' }))
    }

    let hash = signJWT(user)
    res.cookie('authorization', hash, {
        maxAge: 9000000,
        httpOnly: true,
    })
    // save the key.

    res.setHeader('HX-Redirect', '/dashboard')
    res.send('')
})

router.post('/register', validator.register, async (_req, res, next) => {
    try {
        let user = await userRepository.getUser({ email: _req.body.email })

        if (user) {
            const content = pug.compileFile('views/includes/notification.pug')
            return res.send(
                content({ text: 'a user already exists with that email' })
            )
        }

        let password = await hashPassword(_req.body.password)
        let new_user = await userRepository.createUser({
            ..._req.body,
            password,
        })

        const created = await unkey.keys.create({
            apiId: UNKEY_APIKEY,
            byteLength: 16,
            ownerId: `${new_user.id}`,
            meta: {},
        })

        // save the key.
        await keyRepository.create({
            user_id: new_user.id,
            key: created.result.key,
            key_id: created.result.keyId,
        })

        let hash = signJWT(new_user)
        res.cookie('authorization', hash, {
            maxAge: 9000000,
            httpOnly: true,
        })

        res.setHeader('HX-Redirect', '/dashboard')
        res.send('')
    } catch (error: any) {
        console.log(error)
        const content = pug.compileFile('views/includes/notification.pug')
        return res.send(content({ text: 'an error occured' }))
        //return sendError(res, 'An Error Occured.')
    }
})

// link your laptop;;
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
                return sendSuccess(
                    res,
                    'yay, sir/ma... you have already linked this device.'
                )

            const devices = await devicesRepository.getUsersDevices(
                parseInt(req.user.id)
            )
            if (devices.length > 2) {
                return sendError(
                    res,
                    'you already have 2 devices mate. please buy a subscription. saanu mi'
                )
            }

            await devicesRepository.createDevice({
                ...req.body,
                user_id: parseInt(req.user.id),
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

            const file = new Buffer(req.body.config, "base64")
            const hash = hash256(file.toString("ascii"))

            if (hash === config?.hash) {
                return sendError(res, 'file already uploaded', { status: 500 })
            }

            await storage.upload(`${userid}.config.yaml`, file.toString("ascii"))
            await configRepository.updateConfigForUser(userid, { hash })

            return sendSuccess(res, 'yayy! upload success')
        } catch (error) {
            console.log(error)
            return sendError(res, 'an error occured', { status: 500 })
        }
    }
)

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
            if(config_blob) {
                const content = await config_blob.arrayBuffer()
    
                await fs.writeFile('/config.yaml', new DataView(content))
                return res.sendFile('/config.yaml')
                //await fs.unlink('config.yaml')
            } else {
                return sendError(res, "you don't have any config")
            }
        } catch (error) {
            console.log(error)
            return sendError(res, 'an error Occured', { status: 500 })
        }
    }
)

export default router
