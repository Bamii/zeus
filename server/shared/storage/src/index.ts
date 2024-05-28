// Create a single supabase client for interacting with the storage.
import { Token } from 'typedi'
// import Supabase from './impl/supabase'
import AWS from './impl/aws'

export interface Storage {
    client: any

    connect(): this

    get(file: string): string

    download(file: string): Promise<Blob | null>

    upload(file: string, object: string): Promise<string>
}

export default (function () {
    return AWS as Token<Storage>
})()
