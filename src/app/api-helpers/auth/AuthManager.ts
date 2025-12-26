import type { Account } from '@/types/accounts'
import type { FeedViewPost } from '@/types/bsky'
import type { DraftPost } from '@/types/drafts'
import Logger from '../logger'
import * as BlueskyAuth from './BlueskyAuth'
import * as ThreadsAuth from './ThreadsAuth'

const logger = new Logger('AuthManager')

/**
 * Get posts for an account from the appropriate platform
 * Note: Returns FeedViewPost[] for Bluesky, PostDisplayData[] for Threads
 */
export async function getPosts(
  account: Account,
  config?: BlueskyAuth.PostFilters | ThreadsAuth.PostFilters,
  useCache: boolean = false,
): Promise<FeedViewPost[] | any[]> {
  switch (account.platform) {
    case 'bluesky':
      return BlueskyAuth.getPostsAsFeedViewPosts(
        account,
        config as BlueskyAuth.PostFilters,
        useCache,
      )
    case 'threads':
      return ThreadsAuth.getPosts(
        account,
        config as ThreadsAuth.PostFilters,
        useCache,
      )
    default:
      throw new Error(`Unsupported platform: ${account.platform}`)
  }
}

/**
 * Delete posts with specific URIs for an account
 */
export async function deletePostsWithUris(
  account: Account,
  postUris: string[],
): Promise<void> {
  switch (account.platform) {
    case 'bluesky':
      return BlueskyAuth.deletePostsWithUris(account, postUris)
    case 'threads':
      // Threads uses post IDs instead of URIs
      for (const postId of postUris) {
        await ThreadsAuth.deletePost(account, postId)
      }
      return
    default:
      throw new Error(`Unsupported platform: ${account.platform}`)
  }
}

/**
 * Delete posts based on filters for an account
 */
export async function deletePosts(
  account: Account,
  config: BlueskyAuth.PostFilters | ThreadsAuth.PostFilters,
): Promise<void> {
  switch (account.platform) {
    case 'bluesky':
      return BlueskyAuth.deletePosts(account, config as BlueskyAuth.PostFilters)
    case 'threads':
      // Threads doesn't have bulk delete by filters, would need to implement
      // by fetching posts with filters then deleting individually
      throw new Error('Bulk delete by filters not yet supported for Threads')
    default:
      throw new Error(`Unsupported platform: ${account.platform}`)
  }
}

/**
 * Add/publish a post for an account
 */
export async function addPost(
  post: DraftPost,
  account: Account,
): Promise<void> {
  logger.log(
    `Publishing post to ${account.platform} for account: ${account.name}`,
  )

  switch (account.platform) {
    case 'bluesky':
      return BlueskyAuth.addPost(post, account)
    case 'threads':
      return ThreadsAuth.addPost(post, account)
    default:
      throw new Error(`Unsupported platform: ${account.platform}`)
  }
}

/**
 * Save a blob to file for an account (for backups)
 * Note: Only applicable to Bluesky
 */
export async function saveBlobToFile(
  account: Account,
  cid: string,
  filePath: string,
  did: string,
): Promise<boolean> {
  switch (account.platform) {
    case 'bluesky':
      return BlueskyAuth.saveBlobToFile(account, cid, filePath, did)
    case 'threads':
      throw new Error('Blob saving not applicable to Threads platform')
    default:
      throw new Error(`Unsupported platform: ${account.platform}`)
  }
}

/**
 * Logout from an account's platform
 */
export async function logout(account: Account): Promise<void> {
  logger.log(
    `Logging out from ${account.platform} for account: ${account.name}`,
  )

  switch (account.platform) {
    case 'bluesky':
      return BlueskyAuth.logout(account)
    case 'threads':
      return ThreadsAuth.logout(account)
    default:
      throw new Error(`Unsupported platform: ${account.platform}`)
  }
}

export async function logoutAllAccounts(): Promise<void> {
  // Be sure to add logoutAll functions for other platforms here as needed
  await BlueskyAuth.logoutAll()
  await ThreadsAuth.logoutAll()
}

/**
 * Test account connection and credentials
 */
export async function testConnection(account: Account): Promise<boolean> {
  logger.log(
    `Testing connection for ${account.platform} account: ${account.name}`,
  )

  try {
    switch (account.platform) {
      case 'bluesky':
        // Test by trying to fetch a small number of posts
        await BlueskyAuth.getPostsAsFeedViewPosts(account, undefined, false)
        return true
      case 'threads':
        return ThreadsAuth.testConnection(account)
      default:
        throw new Error(`Unsupported platform: ${account.platform}`)
    }
  } catch (error) {
    logger.error(
      `Connection test failed for ${account.platform} account ${account.name}:`,
      error,
    )
    return false
  }
}

// Re-export PostFilters type for convenience
export type { PostFilters } from './BlueskyAuth'
