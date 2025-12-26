import {
  deletePosts as deleteBskyPosts,
  getPostsAsFeedViewPosts as getBskyPosts,
} from '@/app/api-helpers/auth/BlueskyAuth'
import { getPosts as getThreadsPosts } from '@/app/api-helpers/auth/ThreadsAuth'
import {
  backupMediaFiles as backupBskyMediaFiles,
  openBackupAsFeedViewPosts as openBskyBackup,
  saveBackup as saveBskyBackup,
} from '@/app/api-helpers/backup/BlueskyBackup'
import Logger from '@/app/api-helpers/logger'
import { MINIMUM_MINUTES_BETWEEN_BACKUPS } from '@/config/main'
import { formatDate } from '@/helpers/utils'
import { transformFeedViewPostToDisplayData } from '@/transformers/transformFeedViewPostToDisplayData'
import type { Account } from '@/types/accounts'
import type { FeedViewPost } from '@/types/bsky'
import type { AccountBackup, BackupData } from '@/types/types'
import { getAppData, saveAppData } from '../../api-helpers/appData'
import { getCache, setCache } from './CacheService'
import { getSettings } from './SettingsService'

const logger = new Logger('BackupServ')
const CACHE_LENGTH = 1000 * 60 * 5 // 5 minutes

init()
function init() {
  logger.log('BackupService initialized.')
}

function cacheId(accountId: string): string {
  return `backup_cache_${accountId}`
}

export async function getBackups(): Promise<BackupData | null> {
  const appData = await getAppData()
  if (!appData || !appData.settings || !appData.settings.accounts) {
    logger.error('No accounts found in app data')
    return null
  }

  const accounts = appData.settings.accounts
  const backups: AccountBackup[] = []

  appData.lastBackup

  for (const account of accounts) {
    const backup = await getBackup(account)
    if (backup) {
      backups.push(backup)
    } else {
      logger.error(
        `Failed to get backup for account: ${account.name} (${account.id})`,
      )
    }
  }

  const output: BackupData = {
    backups,
    lastBackupDate: appData.lastBackup
      ? new Date(appData.lastBackup).toISOString()
      : null,
  }

  return output
}

export async function getBackup(
  account: Account,
): Promise<AccountBackup | null> {
  const cache = getCache<AccountBackup | null>(cacheId(account.id))
  if (cache) return cache as AccountBackup

  logger.log('Loading backup from disk.')
  setCache(cacheId(account.id), null)

  let posts: any[] = []

  if (account.platform === 'bluesky') {
    const backupPosts = await openBskyBackup(account.id)
    posts = backupPosts.map((p) =>
      transformFeedViewPostToDisplayData(p, account.id),
    )
  } else if (account.platform === 'threads') {
    // Threads posts are fetched directly from API (no local backup storage yet)
    // TODO: Implement Threads backup file storage similar to Bluesky
    try {
      posts = await getThreadsPosts(account, undefined, true) // Use cache
      logger.log(`Fetched ${posts.length} Threads posts from API`)
    } catch (error) {
      logger.error(`Failed to fetch Threads posts for ${account.name}:`, error)
      posts = []
    }
  }

  if (!posts || posts.length === 0) {
    logger.error(`No posts found for account: ${account.name} (${account.id})`)
    return null
  }

  // AccountBackup should have the transformed
  // data into standard PostDisplayData format.
  const accountBackup: AccountBackup = {
    account,
    posts,
    backupDate: new Date().toISOString(),
    totalPosts: posts.length,
    oldestPostDate: posts.length > 0 ? posts[posts.length - 1].indexedAt : null,
  }

  setCache(cacheId(account.id), accountBackup, CACHE_LENGTH)
  return accountBackup
}

export async function runBackup(accountIds: string[] = []): Promise<void> {
  logger.opening('Backup Process')
  const appData = await getAppData() // Not sending any data to client so we can use the non-cleaned version
  const lastBackup = appData?.lastBackup ? new Date(appData.lastBackup) : null
  const minimumNextBackup =
    Date.now() - MINIMUM_MINUTES_BETWEEN_BACKUPS * 60 * 1000

  // Filter accounts based on provided accountIds, or use all accounts if none provided
  accountIds = accountIds.filter((id) => id && id.trim() !== '')
  let accounts = appData.settings?.accounts || []
  if (accountIds.length !== 0) {
    accounts = accounts.filter((account) => accountIds.includes(account.id))
  }

  if (accounts.length === 0) {
    logger.log('No accounts found for backup. Exiting backup process.')
    logger.closing('Backup Process')
    return
  }

  // Make sure we respect minimum time between backups
  if (
    lastBackup &&
    !Number.isNaN(lastBackup.getTime()) &&
    lastBackup.getTime() > minimumNextBackup
  ) {
    logger.log(
      `Last backup at ${formatDate(
        lastBackup,
      )} was less than ${MINIMUM_MINUTES_BETWEEN_BACKUPS} minutes ago. Skipping backup.`,
    )
    logger.closing('Backup Process')
    return
  } else if (lastBackup) {
    logger.log(`Last backup was on ${formatDate(lastBackup)}.`)
  } else {
    logger.log('No previous backup found.')
  }

  let totalPosts = 0

  for (const account of accounts) {
    logger.log(`Starting backup for account: ${account.name} (${account.id})`)

    if (account.platform === 'bluesky') {
      // Load existing backup posts
      const backupPosts = await openBskyBackup(account.id)

      logger.log(`There are ${backupPosts.length} existing posts in backup.`)

      let newFVPosts: FeedViewPost[] = []
      try {
        // Get all posts from Bluesky for the filtered accounts
        newFVPosts = await getBskyPosts(account)
      } catch (error) {
        logger.error('Error getting posts from Bluesky:', error)
      }

      if (newFVPosts.length === 0) {
        logger.log('We received no posts from Bluesky.')
        continue
      }

      logger.log(`There are ${newFVPosts.length} posts from Bluesky.`)

      // Update existing posts with new ones, avoiding duplicates
      const existingPostsMap = new Map(
        backupPosts.map((post) => [post.post.cid, post]),
      )

      let newMediaCount = 0
      newFVPosts.forEach(async (post) => {
        try {
          newMediaCount += await backupBskyMediaFiles(
            account,
            post as FeedViewPost,
          )
        } catch (error) {
          logger.error(
            `Error backing up media files for post: ${post.post.cid}`,
            error,
          )
        }
      })

      logger.log(`There are ${newMediaCount} new media files backed up.`)

      // Add new posts, replacing existing ones with same CID
      newFVPosts.forEach((newPost) => {
        existingPostsMap.set(newPost.post.cid, newPost)
      })

      const combinedPosts = Array.from(existingPostsMap.values())
      try {
        await saveBskyBackup(account.id, combinedPosts)
        totalPosts += combinedPosts.length
        logger.log(
          `Backup saved for account: ${account.name} (${account.id}). Total posts in backup: ${combinedPosts.length}`,
        )
      } catch (error) {
        logger.error('Error saving backup:', error)
        throw new Error('Failed to save backup')
      }
    } else if (account.platform === 'threads') {
      try {
        // For Threads, we fetch posts directly from API
        // TODO: Implement local backup storage for Threads similar to Bluesky
        const threadsPosts = await getThreadsPosts(account)
        totalPosts += threadsPosts.length
        logger.log(
          `Fetched ${threadsPosts.length} posts from Threads for account: ${account.name} (${account.id})`,
        )
      } catch (error) {
        logger.error(
          `Error getting posts from Threads for ${account.name}:`,
          error,
        )
        logger.log('Continuing with next account...')
      }
    } else {
      logger.log(
        `Unsupported platform ${account.platform} for account ${account.name}. Skipping.`,
      )
    }
  }

  // TODO: Replace after testing
  //appData.lastBackup = new Date().toISOString()

  try {
    await saveAppData(appData)
  } catch (error) {
    logger.error('Error saving appData:', error)
  }

  logger.log(
    `Backup complete. There are now ${totalPosts} total posts in backup.`,
  )

  logger.closing('Backup Process')
}

export async function prunePosts(): Promise<void> {
  logger.opening('Prune Process')
  const appData = await getAppData() // Not sending any data to client so we can use the non-cleaned version

  const settings = appData.settings || (await getSettings())
  const accounts = settings?.accounts || []

  if (!settings) {
    logger.log('No settings found, cannot proceed with pruning.')
    logger.closing('Prune Process')
    throw new Error('Settings are required for pruning')
  }

  if (!settings.pruneAfterMonths || settings.pruneAfterMonths < 1) {
    logger.log(
      'Pruning is disabled (pruneAfterMonths is not set or less than 1). Exiting prune process.',
    )
    logger.closing('Prune Process')
    return
  }

  const cutoffDate = new Date()
  cutoffDate.setMonth(cutoffDate.getMonth() - settings.pruneAfterMonths)

  if (Number.isNaN(cutoffDate.getTime())) {
    logger.log('Invalid cutoff date calculated.')
    logger.closing('Prune Process')
    throw new Error('Cutoff date is required')
  }

  logger.log(`Running backup before pruning.`)
  await runBackup() // Ensure we have the latest posts before pruning

  logger.log(`Pruning posts older than ${formatDate(cutoffDate)}.`)

  for (const account of accounts) {
    if (account.platform === 'bluesky') {
      await deleteBskyPosts(account, { cutoffDate })

      const currentPosts = await getBskyPosts(account)
      logger.log(
        `There are now ${currentPosts.length} total posts on ${account.name} account.`,
      )
    } else if (account.platform === 'threads') {
      // TODO: Implement bulk post deletion for Threads
      // Threads API doesn't support bulk deletion, would need to:
      // 1. Fetch posts with cutoffDate filter
      // 2. Delete each post individually
      logger.log(
        `Pruning not yet implemented for Threads account ${account.name}. Skipping.`,
      )
    } else {
      logger.log(
        `Unsupported platform ${account.platform} for account ${account.name}. Skipping.`,
      )
    }
  }

  appData.lastPrune = new Date().toISOString()
  logger.log(`Prune process complete.`)

  try {
    await saveAppData(appData)
  } catch (error) {
    logger.error('Error saving appData:', error)
  }

  logger.closing('Prune Process')
  return
}
