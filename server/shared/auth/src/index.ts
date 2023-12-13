import { Response, NextFunction } from 'express'
//import Database from 'database'
import { User } from 'database/src/models'
import { verifyKey } from '@unkey/api'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import config, { sendError, ApplicationError } from 'config'
import { Container } from 'typedi'
import { DevicesRepository, UserRepository } from 'database'

const userRepository = Container.get(UserRepository)
const deviceRepository = Container.get(DevicesRepository)
const SALT_ROUNDS = config.salt_rounds
const TOKEN_SECRET_KEY = config.token_secret

export const clientAuth = () => {
    return async (req: any & User, res: Response, next: NextFunction) => {
        const { authorization } = req.headers
        try {
            if (!authorization) throw new ApplicationError('closed sesame')

            const [protocol, token] = authorization.split(' ')
            if (protocol !== 'Bearer' || !token)
                throw new ApplicationError('gerrarahia! you sly being.')

            const result = jwt.verify(token, TOKEN_SECRET_KEY)
            const { email } = result as { email: string }
            //const user = await database.getUserByEmailOrPhone({ email })
            const user = { email }

            if (!user)
                throw new ApplicationError(
                    'hmm there seem to have been an error, fair maiden.'
                )

            req.user = user
            return next()
        } catch (error: any) {
            if (error instanceof ApplicationError)
                return sendError(res, error.message, { status: 401 })

            return sendError(res, 'An application error occured.', {
                status: 500,
            })
        }
    }
}

export const signJWT = <T extends string | Record<string, string>>(
    value: T
) => {
    return jwt.sign(value, TOKEN_SECRET_KEY)
}

export const hashPassword = async (password: string): Promise<string> => {
    return bcrypt.hash(password, SALT_ROUNDS)
}

export const comparePassword = async ({
    hashedPassword,
    password,
}: {
    hashedPassword: string
    password: string
}): Promise<boolean> => {
    return bcrypt.compare(password, hashedPassword)
}

export const extract = <T extends Record<string, any>>(
    object: T,
    key: string
): Partial<T> => {
    delete object[key]
    return object
}

export const isDeviceRegistered = async (
    req: any,
    res: Response,
    next: NextFunction
) => {
    const fingerprint = req.body.fingerprint
    const user_id = req.user.id

    const device = await deviceRepository.getUsersDevice(user_id, fingerprint)

    if (!device) return sendError(res, 'Unauthorized', { status: 401 })

    return next()
}

export const apiKeyAuth = async (
    req: any,
    res: Response,
    next: NextFunction
) => {
    const authHeader: string | undefined = req.headers['authorization']
    const key = authHeader?.toString().replace('Bearer ', '')
    //const key = ''

    console.log(key)
    if (!key) {
        return sendError(res, 'Unauthorized', { status: 401 })
    }

    const { result, error } = await verifyKey(key)
    console.log(result, error)

    if (error) {
        console.error(error)
        return sendError(res, 'Internal Server Error', { status: 500 })
    }

    if (!result.valid) {
        return sendError(res, 'Unauthorized', { status: 401 })
    }

    const user = await userRepository.getUser({
        id: parseInt(result.ownerId ?? '0'),
    })

    if (!user)
        return sendError(
            res,
            'hmm there seem to have been an error, fair maiden.',
            { status: 500 }
        )

    req.user = extract(user, 'password')
    return next()
}
