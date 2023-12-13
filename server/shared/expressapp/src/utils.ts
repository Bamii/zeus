import crypto from 'crypto'

export function sendSuccess<T>(
    res: any,
    message: string,
    opts?: { status?: number; data?: T }
): Response {
    const options: { message: string; data?: T; status: string } = {
        status: 'success',
        message,
    }
    if (opts?.data) options.data = opts.data
    return res.status(opts?.status ?? 200).json(options)
}

export function sendError<T>(
    res: any,
    message: string,
    opts?: { status?: number; data?: T }
): Response {
    const options: { message: string; data?: T; status: string } = {
        status: 'error',
        message,
    }
    if (opts?.data) options.data = opts.data
    return res.status(opts?.status ?? 500).json(options)
}

export function hash256(value: string) {
    return crypto.createHash('sha256').update(value).digest('hex')
}

export class ApplicationError extends Error {
    is_application_error: boolean = true
}
