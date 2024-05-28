import log from 'logger'
import { Storage } from '..'
import { Service } from 'typedi'
import { S3Client, PutObjectCommand, GetObjectCommand  } from '@aws-sdk/client-s3'
import _config, { ApplicationError } from 'config'

const config = _config.storage

@Service()
export default class AWSstore implements Storage {
    client: any

    constructor() {
        this.connect()
    }

    connect(): this {
        try {
          this.client = new S3Client({
            forcePathStyle: true,
            region: config.region,
            endpoint: config.connection_url,
            credentials: {
              accessKeyId: config.aws_access_key_id,
              secretAccessKey: config.aws_secret_access_key,
            }
          })

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
      try {
        const command = new GetObjectCommand({
            Bucket: 'zeus',
            Key: `configs/${file}`,
          })
  
          const met = await this.client.send(command)
  
          return new Blob(await met.Body.transformToString())
      } catch(e) {
          return null
      } 
    }

    // this function will replace the old file with the latest one provided the file
    // has been uploaded already
    async upload(file: string, object: string): Promise<string> {
        log.info(`uploading file: ${file}`)
        console.log(`uploading file: ${file}`)
        log.info(file, object)
        
        const uploadCommand = new PutObjectCommand({
          Bucket: 'zeus',
          Key: `configs/${file}`,
          Body: object,
          ContentType: 'text/txt',
        })
        
        await this.client.send(uploadCommand)
        log.info('successfully uploaded file ', file)
        return ""
    }
}