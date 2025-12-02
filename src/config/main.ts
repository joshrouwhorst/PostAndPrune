import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SRC_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

export const DATA_LOCATION =
  process.env.DEFAULT_DATA_LOCATION || `${SRC_DIR}/data`

export const APP_DATA_FILE = `${DATA_LOCATION}/app-data/app-data`
export const CREDENTIALS_FILE = `${DATA_LOCATION}/app-data/credentials`
export const LOGS_PATH = `${DATA_LOCATION}/logs`

// If true, prevents posting to Bluesky (for testing purposes)
export const PREVENT_POSTING = process.env.PREVENT_POSTING === 'true' || false

export const getPaths = () => {
  return {
    mainDataLocation: DATA_LOCATION,
    draftPostsPath: `${DATA_LOCATION}/draft-posts`,
    publishedPostsPath: `${DATA_LOCATION}/published-posts`,
    backupPath: `${DATA_LOCATION}/backup`,
    backupMediaPath: `${DATA_LOCATION}/backup/media`,
    postBackupFile: `${DATA_LOCATION}/backup/bluesky-posts.json`,
  }
}

const APP_DATA_ENCRYPTION_KEY =
  process.env.APP_DATA_ENCRYPTION_KEY || 'd3fAul7_5ecret_k3y_32bytes!' // Must be 32 bytes
export const ENCRYPTION_KEY = APP_DATA_ENCRYPTION_KEY?.padEnd(32, '0').slice(
  0,
  32,
) // Must be 32 bytes

export const DEFAULT_PRUNE_MONTHS = process.env.DEFAULT_PRUNE_MONTHS || 3

export const DEFAULT_GROUP = 'default' // in all config files
export const DEFAULT_POST_SLUG = 'draft'

export const MINIMUM_MINUTES_BETWEEN_BACKUPS = 1 // TODO: Set back to 5 after testing

export const DRAFT_MEDIA_ENDPOINT = '/api/drafts/media'
export const BACKUP_MEDIA_ENDPOINT = '/api/backup/images'
export const SUPPORTED_SOCIAL_PLATFORMS = ['bluesky'] as const

export const POSTS_PER_PAGE = 20
export const MAX_POSTS = 1000

export const DATE_FORMAT = 'yyyy-MM-dd'
export const DATE_TIME_FORMAT = 'yyyy-MM-dd HH:mm:ss'
export const DEFAULT_TIMEZONE = 'America/New_York'
export const HEADER_NAV_ITEMS = [
  { label: 'Home', href: '/' },
  { label: 'Drafts', href: '/drafts' },
  { label: 'Schedules', href: '/schedules' },
]

export const CRON_FREQUENCY_MINUTES = 5 // how often to check for scheduled posts

export const APP_PORT = process.env.APP_PORT || 3000
export const APP_HOST = process.env.APP_HOST || 'localhost'
export const APP_URL = process.env.APP_URL || `http://${APP_HOST}:${APP_PORT}`

export const BSKY_DISPLAY_NAME = process.env.BSKY_DISPLAY_NAME || ''
export const BSKY_IDENTIFIER = process.env.BSKY_IDENTIFIER || ''
export const BSKY_PASSWORD = process.env.BSKY_PASSWORD || ''
