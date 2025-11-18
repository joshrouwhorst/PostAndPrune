import type { Account } from '@/types/accounts'
import type { FeedViewPost } from '@/types/bsky'
import type { DraftPost } from '@/types/drafts'
import Logger from '../logger'
import * as BlueskyAuth from './BlueskyAuth'

const logger = new Logger('AuthManager')

/**
 * Get posts for an account from the appropriate platform
 */
export async function getPosts(
  account: Account,
  config?: BlueskyAuth.PostFilters,
  useCache: boolean = false
): Promise<FeedViewPost[]> {
  switch (account.platform) {
    case 'bluesky':
      return BlueskyAuth.getPostsAsFeedViewPosts(account, config, useCache)
    default:
      throw new Error(`Unsupported platform: ${account.platform}`)
  }
}

/**
 * Delete posts with specific URIs for an account
 */
export async function deletePostsWithUris(
  account: Account,
  postUris: string[]
): Promise<void> {
  switch (account.platform) {
    case 'bluesky':
      return BlueskyAuth.deletePostsWithUris(account, postUris)
    default:
      throw new Error(`Unsupported platform: ${account.platform}`)
  }
}

/**
 * Delete posts based on filters for an account
 */
export async function deletePosts(
  account: Account,
  config: BlueskyAuth.PostFilters
): Promise<void> {
  switch (account.platform) {
    case 'bluesky':
      return BlueskyAuth.deletePosts(account, config)
    default:
      throw new Error(`Unsupported platform: ${account.platform}`)
  }
}

/**
 * Add/publish a post for an account
 */
export async function addPost(
  post: DraftPost,
  account: Account
): Promise<void> {
  logger.log(
    `Publishing post to ${account.platform} for account: ${account.name}`
  )

  switch (account.platform) {
    case 'bluesky':
      return BlueskyAuth.addPost(post, account)
    default:
      throw new Error(`Unsupported platform: ${account.platform}`)
  }
}

/**
 * Save a blob to file for an account (for backups)
 */
export async function saveBlobToFile(
  account: Account,
  cid: string,
  filePath: string,
  did: string
): Promise<boolean> {
  switch (account.platform) {
    case 'bluesky':
      return BlueskyAuth.saveBlobToFile(account, cid, filePath, did)
    default:
      throw new Error(`Unsupported platform: ${account.platform}`)
  }
}

/**
 * Logout from an account's platform
 */
export async function logout(account: Account): Promise<void> {
  logger.log(
    `Logging out from ${account.platform} for account: ${account.name}`
  )

  switch (account.platform) {
    case 'bluesky':
      return BlueskyAuth.logout(account)
    default:
      throw new Error(`Unsupported platform: ${account.platform}`)
  }
}

/**
 * Test account connection and credentials
 */
export async function testConnection(account: Account): Promise<boolean> {
  logger.log(
    `Testing connection for ${account.platform} account: ${account.name}`
  )

  try {
    switch (account.platform) {
      case 'bluesky':
        // Test by trying to fetch a small number of posts
        await BlueskyAuth.getPostsAsFeedViewPosts(account, undefined, false)
        return true
      default:
        throw new Error(`Unsupported platform: ${account.platform}`)
    }
  } catch (error) {
    logger.error(
      `Connection test failed for ${account.platform} account ${account.name}:`,
      error
    )
    return false
  }
}

// Re-export PostFilters type for convenience
export type { PostFilters } from './BlueskyAuth'
