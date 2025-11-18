import type { Account } from './accounts'
import { PostData } from './bsky'
import type { Schedule } from './scheduler'

export interface AppData {
  lastBackup?: string | null
  lastPrune?: string | null
  postsOnBsky?: number | null
  totalPostsBackedUp?: number | null
  oldestBskyPostDate?: string | null
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

export interface BackupData {
  lastBackup: string | null
  backups: AccountBackup[]
}

export interface AccountBackup {
  account: Account
  posts: PostData[]
  backupDate: string
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
