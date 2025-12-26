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
export const SUPPORTED_SOCIAL_PLATFORMS = ['bluesky', 'threads'] as const

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

// Threads API Configuration
export const THREADS_CONFIG = {
  API_BASE_URL: process.env.THREADS_API_BASE_URL || 'https://graph.threads.net',
  APP_ID: process.env.THREADS_APP_ID,
  APP_SECRET: process.env.THREADS_APP_SECRET,
  REDIRECT_URI: process.env.THREADS_REDIRECT_URI,
  SCOPES: [
    'threads_basic',
    'threads_content_publish',
    'threads_manage_replies',
  ],

  // OAuth Configuration
  AUTHORIZATION_URL: 'https://threads.net/oauth/authorize',
  TOKEN_URL: 'https://graph.threads.net/oauth/access_token',

  // Token Management
  TOKEN_REFRESH_THRESHOLD: 5 * 60 * 1000, // Refresh if expires in 5 minutes
  TOKEN_REFRESH_RETRY_COUNT: 3,

  // API Configuration
  DEFAULT_API_VERSION: 'v1.0',
  REQUEST_TIMEOUT: 30000, // 30 seconds
  MAX_RETRY_COUNT: 3,

  // Media Configuration
  MAX_IMAGE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_VIDEO_SIZE: 100 * 1024 * 1024, // 100MB
  SUPPORTED_IMAGE_FORMATS: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  SUPPORTED_VIDEO_FORMATS: ['mp4', 'mov', 'avi'],

  // Text Limits
  MAX_TEXT_LENGTH: 500,
  MAX_ALT_TEXT_LENGTH: 100,
} as const

// Validation function
export function validateThreadsConfig(): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!THREADS_CONFIG.APP_ID) {
    errors.push('THREADS_APP_ID environment variable is required')
  }

  if (!THREADS_CONFIG.APP_SECRET) {
    errors.push('THREADS_APP_SECRET environment variable is required')
  }

  if (!THREADS_CONFIG.REDIRECT_URI) {
    errors.push('THREADS_REDIRECT_URI environment variable is required')
  } else {
    try {
      new URL(THREADS_CONFIG.REDIRECT_URI)
    } catch {
      errors.push('THREADS_REDIRECT_URI must be a valid URL')
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

// Initialize validation on startup
if (process.env.NODE_ENV === 'production') {
  const validation = validateThreadsConfig()
  if (!validation.isValid) {
    console.warn(
      'Threads API configuration issues:',
      validation.errors.join(', '),
    )
    console.warn('Threads features will be disabled')
  }
}

// Export helper function to check if Threads is enabled
export function isThreadsEnabled(): boolean {
  const validation = validateThreadsConfig()
  return validation.isValid
}
