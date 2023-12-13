import expressapp from 'expressapp'
import { Router } from 'express'
//import admin from "admin/src/routes";
import 'newrelic'
import * as dotenv from 'dotenv'
dotenv.config()

const router = Router()

router.get('/', (_, res) => {
    res.send('Welcome to DURO doorman! happy waiting :)')
})
//router.use('/admin', admin);

expressapp(Router().use('/api/v1', router))
