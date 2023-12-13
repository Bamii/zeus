import 'dotenv/config'

const config = {
    api_url: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000',
    app_url: process.env.APP_URL ?? '',
    salt_rounds: process.env.SALT_ROUNDS ?? 10,
    token_secret: process.env.JWT_SECRET ?? 'secret',
    environment: process.env.NODE_ENV ?? 'development',
    port: process.env.PORT,
    database: {
        connection_url: '',
        private_key: '',
        database: '',
    },
    storage: {
        connection_url: process.env.STORAGE_URL ?? '',
        private_key: process.env.STORAGE_KEY ?? '',
        qr_bucket: 'merchant-qr-codes',
    },
    queue: {
        connection_url: process.env.QUEUE_CONNECTION_URL ?? '',
    },
    notifications: {
        email: {
            public_key: process.env.EMAIL_PUBLIC_KEY ?? '',
            private_key: process.env.EMAIL_PRIVATE_KEY ?? '',
        },
        sms: {},
    },
}

export default config

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

export class ApplicationError extends Error {
    is_application_error: boolean = true
    code: number | null = null

    constructor(message: string, code: number | null = null) {
        super(message)
        this.code = code
    }
}
