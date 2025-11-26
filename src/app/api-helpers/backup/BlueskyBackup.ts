import Logger from '@/app/api-helpers/logger'
import {
  downloadFile,
  readJsonFromFile,
  saveJsonToFile,
} from '@/app/api-helpers/utils'
import { checkIfExists } from '@/app/api/services/FileService'
import { getPaths } from '@/config/main'
import type { Account } from '@/types/accounts'
import type { FeedViewPost, PostData } from '@/types/bsky'
import type { AppBskyEmbedImages, AppBskyEmbedVideo } from '@atproto/api'
import type * as AppBskyFeedPost from '@atproto/api/src/client/types/app/bsky/feed/post'
import path from 'path'
import { transformFeedViewPostToPostData } from '../../../transformers/transformFeedViewPostToPostData'
import { saveBlobToFile } from '../auth/BlueskyAuth'
import { Governor } from '../governor'

const governor = new Governor(500)

const logger = new Logger('BskyBackup')

export async function openBackup(accountId: string): Promise<PostData[]> {
  try {
    const feedViewPosts = await openBackupAsFeedViewPosts(accountId)
    return feedViewPosts.map((p) =>
      transformFeedViewPostToPostData(p, accountId)
    )
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
  const backupFile = path.join(backupPath, accountId, `posts.json`)
  try {
    return (await readJsonFromFile<FeedViewPost[]>(backupFile)) || []
  } catch (error) {
    logger.error(`Error reading backup file ${backupFile}:`, error)
    return []
  }
}

export async function saveBackup(
  accountId: string,
  data: FeedViewPost[]
): Promise<void> {
  const { backupPath } = await getPaths()
  const backupFile = path.join(backupPath, accountId, `posts.json`)
  // Sort newest to oldest
  data.sort((a, b) => {
    return (
      new Date(b.post.indexedAt).getTime() -
      new Date(a.post.indexedAt).getTime()
    )
  })

  await saveJsonToFile(data, backupFile)
}

export async function backupMediaFiles(
  account: Account,
  feedViewPost: FeedViewPost
): Promise<number> {
  const post = feedViewPost.post
  const record = post.record as AppBskyFeedPost.Record

  if (
    post.cid === 'bafyreia672shun4ikmf44mv74j54basoth3xnfljxz6j5ukhpkuy3mq5zm'
  ) {
    console.log('Debug break')
  }

  if (post.embed && post.embed.$type === 'app.bsky.embed.images#view') {
    let _fileWriteCount = 0
    const embed = post.embed as AppBskyEmbedImages.View

    if (!embed.images || embed.images.length === 0) {
      return 0
    }
    for (let i = 0; i < embed.images.length; i++) {
      const image = embed.images[i]
      const imageUrl = image.fullsize
      // Extract file extension from the URL after @ symbol, or default to .jpg
      const mediaType = getMediaType(imageUrl)
      const postDate = new Date(record.createdAt)
      const year = postDate.getFullYear().toString()
      const mediaLocation = getMediaLocation(
        account.id,
        getMediaName(post, mediaType, i),
        year,
        mediaType
      )

      try {
        await governor.wait()
        const write = await downloadFile({
          url: imageUrl,
          filePath: mediaLocation,
          overwrite: false,
        })
        if (write) {
          _fileWriteCount++
        }
      } catch (err) {
        logger.error(
          `Error downloading image ${imageUrl} to ${mediaLocation}:`,
          err
        )
      }
    }

    return _fileWriteCount
  }

  if (!post.embed || post.embed.$type !== 'app.bsky.embed.video#view') {
    return 0
  }

  // Handle videos
  const embedView = post.embed as AppBskyEmbedVideo.View
  const embed = record.embed as AppBskyEmbedVideo.Main

  if (!embed?.video) {
    return 0
  }

  const write = await saveBlobData(
    account,
    embed.video,
    `video-${post.cid}`,
    embedView.cid,
    post.author.did
  )

  if (write) return 1

  return 0
}

export function getMediaType(imageUrl: string): string {
  const atIndex = imageUrl.lastIndexOf('@')
  return imageUrl.substring(atIndex + 1)
}

export function getMediaExtension(imageUrl: string): string {
  const mediaType = getMediaType(imageUrl)
  const dotIndex = mediaType.lastIndexOf('.')
  if (dotIndex !== -1) {
    return mediaType.substring(dotIndex + 1)
  }
  return mediaType
}

export function getMediaLocation(
  accountId: string,
  mediaName: string,
  year: string,
  mediaType: string
) {
  const { backupPath } = getPaths()
  return path.join(backupPath, accountId, 'media', year, mediaType, mediaName)
}

export function getMediaApiUrl(
  accountId: string,
  mediaName: string,
  year: string,
  mediaType: string
) {
  return path.join('/api/media', accountId, 'media', year, mediaType, mediaName)
}

export function getMediaName(
  post: FeedViewPost['post'],
  extension: string,
  index: number
): string {
  // Extract file extension from the URL after @ symbol, or default to .jpg
  const mediaExtension = extension ? `.${extension}` : '.jpg'
  const postId = post.cid

  const mediaFilename = `${postId}_${index}${mediaExtension}`
  return mediaFilename
}

/**
 * Save blob data to filesystem using AT Protocol blob reference
 * Supports both images and videos
 * @param mediaBlob - The blob object from AT Protocol (image or video)
 * @param filename - The filename to save as
 * @param cid - The CID of the blob
 * @param userDid - The DID of the user who owns the blob
 * @returns Promise<boolean> - true if successful
 *
 * Usage examples:
 * const success = await saveBlobData(imageBlob, 'my-image.jpg', 'did:plc:example123')
 * const success = await saveBlobData(videoBlob, 'my-video.mp4', 'did:plc:example123')
 */
export async function saveBlobData(
  account: Account,
  mediaBlob: {
    ref: {
      bytes?: Uint8Array
      $link?: string
    }
    mimeType: string
    size: number
  },
  filename: string,
  cid: string,
  userDid: string
): Promise<boolean> {
  try {
    // Get the media extension from mime type
    const extension = getExtensionFromMimeType(mediaBlob.mimeType)

    // Create full filename with extension if not provided
    const fullFilename = filename.includes('.')
      ? filename
      : `${filename}.${extension}`

    // Get media storage location
    const postDate = new Date()
    const year = postDate.getFullYear().toString()
    const mediaLocation = getMediaLocation(
      account.id,
      fullFilename,
      year,
      extension
    )

    // If the file already exists, skip saving
    const fileExists = await checkIfExists(mediaLocation)
    if (fileExists) return false

    // Use the blob save function from bluesky.ts
    const success = await saveBlobToFile(account, cid, mediaLocation, userDid)

    if (success) {
      const mediaType = mediaBlob.mimeType.startsWith('video/')
        ? 'video'
        : 'image'
      logger.log(`Successfully saved ${mediaType} blob to: ${mediaLocation}`)
    } else {
      logger.error(`Failed to save blob to: ${mediaLocation}`)
    }

    return success
  } catch (error) {
    logger.error('Error in saveBlobData:', error)
    return false
  }
}

/**
 * Get file extension from MIME type, with support for common video formats
 */
function getExtensionFromMimeType(mimeType: string): string {
  const mimeToExtension: Record<string, string> = {
    // Image formats
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    'image/bmp': 'bmp',
    'image/tiff': 'tiff',

    // Video formats
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/ogg': 'ogv',
    'video/avi': 'avi',
    'video/mov': 'mov',
    'video/wmv': 'wmv',
    'video/flv': 'flv',
    'video/3gp': '3gp',
    'video/mkv': 'mkv',
    'video/quicktime': 'mov',

    // Audio formats (in case AT Protocol supports them)
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'audio/ogg': 'ogg',
    'audio/aac': 'aac',
  }

  // Try exact match first
  const exactMatch = mimeToExtension[mimeType.toLowerCase()]
  if (exactMatch) {
    return exactMatch
  }

  // Fall back to extracting from mime type
  const parts = mimeType.split('/')
  if (parts.length === 2) {
    return parts[1].toLowerCase()
  }

  // Default fallback based on type
  if (mimeType.startsWith('video/')) {
    return 'mp4'
  } else if (mimeType.startsWith('audio/')) {
    return 'mp3'
  } else {
    return 'jpg'
  }
}
