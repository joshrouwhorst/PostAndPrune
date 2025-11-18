import Logger from '@/app/api-helpers/logger'
import { readJsonFromFile } from '@/app/api-helpers/utils'
import { getPaths } from '@/config/main'
import type { FeedViewPost, PostData } from '@/types/bsky'
import path from 'path'
import { transformFeedViewPostToPostData } from '../transformFeedViewPostToPostData'

const logger = new Logger('BskyBackup')

export async function openBackup(accountId: string): Promise<PostData[]> {
  try {
    const feedViewPosts = await openBackupAsFeedViewPosts(accountId)
    return feedViewPosts.map(transformFeedViewPostToPostData)
  } catch (error) {
    logger.error(`Error transforming backup for ${accountId}:`, error)
    return []
  }
}

export async function openBackupAsFeedViewPosts(
  accountId: string
): Promise<FeedViewPost[]> {
  // Ensure backup directory exists
  const { backupPath } = await getPaths()
  const backupFile = path.join(backupPath, accountId, `bluesky.json`)
  try {
    return (await readJsonFromFile<FeedViewPost[]>(backupFile)) || []
  } catch (error) {
    logger.error(`Error reading backup file ${backupFile}:`, error)
    return []
  }
}
