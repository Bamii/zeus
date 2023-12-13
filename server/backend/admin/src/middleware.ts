import z from 'zod'
import validator from 'input-validator'

export const loginValidator = validator(
    z.object({
        email: z.string().email(),
        password: z.string(),
    })
)

export const registerUser = validator(
    z.object({
        name: z.string(),
        email: z.string().email(),
        password: z.string(),
    })
)

export const linkDevice = validator(
    z.object({
        platform: z.string(),
    })
)

export const getLatestConfig = validator(
    z.object({
        current_version: z.string().optional(),
    })
)

export const deviceIdentifier = validator(
    z.object({
        fingerprint: z.string(),
    })
)

export const updateLatestConfig = validator(
    z.object({
        fingerprint: z.string(),
        config: z.string(),
    })
)
