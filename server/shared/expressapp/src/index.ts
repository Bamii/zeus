import express, { Router } from 'express'
import cors from 'cors'
import path from 'path'
import notFoundMiddleware, { errorMiddleware } from 'notfoundmiddleware'
import log from 'logger'
import 'dotenv/config'
import config from 'config'
import cookieParser from 'cookie-parser'
import bodyParser from 'body-parser'
import { rateLimit } from 'express-rate-limit'
require('newrelic')
import { APIToolkit } from 'apitoolkit-express'

import morgan from './config/morgan'

const randomPort = (min = 3000, max = 6000) => {
    min = Math.ceil(min)
    max = Math.floor(max)
    // The maximum is exclusive and the minimum is inclusive
    return Math.floor(Math.random() * (max - min) + min)
}

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
    standardHeaders: 'draft-7', // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
    // store: ... , // Use an external store for consistency across multiple server instances.
})

// Apply the rate limiting middleware to all requests.
const expressApp = async (router: Router, _mw?: string[]) => {
    const app = express()
    app.use(limiter)
    app.use(cors())
    app.use(express.json())
    app.use(morgan)
    app.use(cookieParser())
    app.use(bodyParser.json())
    app.use(bodyParser.urlencoded({ extended: true }))
    app.set('view engine', 'pug')
    console.log(path.join(__dirname, '../public'))
    app.use('/public', express.static(path.join(__dirname, '../public')))

    app.use('/', router)

    try {
        const apitoolkitClient = await APIToolkit.NewClient({
            apiKey: process.env.API_TOOLKIT_KEY ?? '',
        })
        app.use(apitoolkitClient.expressMiddleware)
    } catch (error) {}

    app.use(notFoundMiddleware, errorMiddleware)

    const port = config.port || randomPort()
    app.listen(port, () => {
        log.info(`Listening: http://localhost:${port}`)
    })
}

export default expressApp
