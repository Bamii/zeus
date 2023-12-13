import log from 'logger'
import { Storage } from '..'
import { Service } from 'typedi'
import { createClient } from '@supabase/supabase-js'
import _config, { ApplicationError } from 'config'

const config = _config.storage

@Service()
export default class Supabase implements Storage {
    client: any

    constructor() {
        this.connect()
    }

    connect(): this {
        try {
            this.client = createClient(
                config.connection_url,
                config.private_key
            )
            log.info('connected to client')
            return this
        } catch (error: any) {
            log.error('could not connect to client', error)
            throw new ApplicationError(
                'An error occured while connecting to the client.'
            )
        }
    }

    get(file: string): string {
        return file
    }

    async download(file: string): Promise<Blob | null> {
        const { data, error } = await this.client.storage
            .from('configs')
            .download(`configs/${file}`)

        if (error) {
            return null
        }
        return data
    }

    // this function will replace the old file with the latest one provided the file
    // has been uploaded already
    async upload<T>(file: string, object: T): Promise<string> {
        log.info(`uploading file: ${file}`)
        console.log(`uploading file: ${file}`)
        log.info(file, object)

        const { error } = await this.client.storage
            .from('configs')
            .upload(`configs/${file}`, object, {
                upsert: true,
                cacheControl: 3600,
            })
        if (error) {
            log.error(error)
            console.log(error)
            throw new ApplicationError(
                'An error occured while uploading the object.'
            )
        }
        log.info('successfully uploaded file ', file)

        const {
            data: { publicUrl: url },
        } = this.client.storage
            .from(config.qr_bucket)
            .getPublicUrl(`public/${file}`)
        return url
    }
}
