import type { Account } from './accounts'
import type { Schedule } from './scheduler'

export interface AppData {
  lastBackup?: string | null
  lastPrune?: string | null
  schedules?: Schedule[] | null
  settings?: Settings | null
}

export interface Settings {
  backupLocation?: string
  autoPruneFrequencyMinutes?: number
  pruneAfterMonths?: number
  defaultTimezone?: string
  autoBackupFrequencyMinutes?: number
  hasOnboarded: boolean
  accounts: Account[]
}

// Container for all the AccountBackup records
export interface BackupData {
  backups: AccountBackup[]
  lastBackupDate: string | null
}

// Backup data for a single account
export interface AccountBackup {
  account: Account
  posts: PostDisplayData[]
  backupDate: string
  totalPosts: number
  oldestPostDate: string | null
}

export interface PostMedia {
  url: string
  width: number
  height: number
  size: number
}

export interface PostDisplayData {
  video?: {
    url: string
    width: number
    height: number
    size: number
  }
  text: string
  author?: {
    displayName?: string
    handle?: string
  }
  indexedAt: string
  createdAt: string // Created at seems to be more reliably the same whereas indexedAt can change
  likeCount?: number
  replyCount?: number
  repostCount?: number
  images?: PostMedia[]
  isRepost: boolean
  parent?: PostDisplayData
  root?: PostDisplayData
  draftId?: string
  postId?: string
  group?: string
  slug?: string
}
