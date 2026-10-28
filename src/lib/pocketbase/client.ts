import PocketBase from 'pocketbase'
import { resolvePocketBaseUrl } from './config'

const pb = new PocketBase(resolvePocketBaseUrl())
pb.autoCancellation(false)

export default pb
