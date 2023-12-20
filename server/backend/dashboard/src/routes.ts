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

const unkey = new Unkey({ rootKey: 'unkey_3ZnyCB4BHxHbJbvfaWSihqRX' })
const router = Router()
//const cache = Container.get(CacheInstance)
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

    console.log(comparison)
    if (!comparison) {
        const content = pug.compileFile('views/includes/notification.pug')
        return res.send(content({ text: 'invalid login combination' }))
        //return sendError(res, "There's no user with that email.", {
        //    status: 401,
        //})
    }

    let hash = signJWT(user)
    res.cookie('authorization', hash, {
        maxAge: 9000000,
        httpOnly: true,
    })
    // save the key.
    console.log(user)

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
            //return sendError(res, "")
        }

        let password = await hashPassword(_req.body.password)
        console.log(password)
        let new_user = await userRepository.createUser({
            ..._req.body,
            password,
        })

        const created = await unkey.keys.create({
            apiId: 'api_8qR9AiEBdvrUCAuES4q569',
            byteLength: 16,
            ownerId: `${new_user.id}`,
            meta: {},
        })

        // save the key.
        console.log(created)
        console.log(new_user)

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
        //return sendError(res, 'An Error Occured')
    }
})

router.get(
    '/dashboard',
    clientAuth({ redirect: true }),
    async (req: any & User, res) => {
        try {
            const email = req.user?.email
            const user = await userRepository.getUser({ email })

            res.render('dashboard', { download_link: '', user, auth: true })
        } catch (error) {
            console.log(error)
        }
    }
)
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

            const devices = await devicesRepository.getUsersDevices(
                parseInt(req.user.id)
            )
            if (devices.length > 3) {
                return sendError(
                    res,
                    'you already have 3 devices mate. please buy a subscription. saanu mi'
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

            //console.log(hash256(content));
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
