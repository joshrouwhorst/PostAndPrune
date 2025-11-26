import { decrypt, encrypt } from '@/app/api/services/FileService'
import { APP_DATA_FILE } from '@/config/main'
import type { AppData } from '@/types/types'
import fs from 'fs'
import path from 'path'
import Logger from './logger'
import { ensureDir } from './utils'

const logger = new Logger('AppData')

let _cache: AppData | null = null
const CACHE_DURATION_MS = 5 * 60 * 1000 // 5 minutes
let _lastCacheTime = 0

export async function getAppData(): Promise<AppData> {
  if (_cache && Date.now() - _lastCacheTime < CACHE_DURATION_MS) return _cache
  await ensureDir(path.dirname(APP_DATA_FILE))
  if (!fs.existsSync(APP_DATA_FILE)) {
    return {
      lastBackup: null,
      lastPrune: null,
      schedules: null,
      settings: null,
    }
  }
  const encrypted = await fs.promises.readFile(APP_DATA_FILE, 'utf-8')
  const data = decrypt(encrypted)
  const appData = JSON.parse(data) as AppData
  _cache = appData
  _lastCacheTime = Date.now()
  return appData
}

export async function saveAppData(data: AppData): Promise<void> {
  logger.log('Saving app data.')
  await ensureDir(path.dirname(APP_DATA_FILE))
  if (data.settings?.accounts) {
    // Don't save credentials to disk, remove them from the accounts in the app data before saving.
    data.settings.accounts = data.settings.accounts.map((account) => ({
      ...account,
      credentials: undefined,
    }))
  }
  _cache = data
  _lastCacheTime = Date.now()
  const json = JSON.stringify(data)
  const encrypted = encrypt(json)
  await fs.promises.writeFile(APP_DATA_FILE, encrypted)
}
