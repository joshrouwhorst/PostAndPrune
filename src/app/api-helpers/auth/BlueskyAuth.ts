import { getPaths, PREVENT_POSTING } from '@/config/main'
import { wait } from '@/helpers/utils'
import type { Account } from '@/types/accounts'
import type { FeedViewPost } from '@/types/bsky'
import type { DraftPost } from '@/types/drafts'
import { AtpAgent, RichText } from '@atproto/api'
import ExifReader from 'exifreader'
import fs from 'fs/promises'
import path from 'path'
import { Governor } from '../governor'
import Logger from '../logger'

const logger = new Logger('BlueskySvc')

const governor = new Governor(1000)

export interface PostFilters {
  cutoffDate?: Date
  isComment?: boolean // whether to delete comments/replies as well
}

let postCache: FeedViewPost[] | null = null
let cacheDate: Date | null = null
const CACHE_DURATION_MS = 5 * 60 * 1000 // 5 minutes

const _agents: Map<string, { agent: AtpAgent; account: Account }> = new Map()

async function getAgent(account: Account): Promise<AtpAgent> {
  if (!_agents.has(account.id)) {
    logger.log('Creating Bluesky agent.')
    const agent = await createAgent(account)
    _agents.set(account.id, { agent, account })
  }
  const agent = _agents.get(account.id)?.agent
  if (!agent) throw new Error('Failed to get Bluesky agent')
  return agent
}

export async function logout(account: Account) {
  const agent = await getAgent(account)

  if (agent) {
    logger.log(`Logging ${account.name} out from Bluesky.`)
    await agent.logout()
    _agents.delete(account.id)
  } else {
    logger.log('No agent to log out.')
  }
}

export async function logoutAll() {
  for (const { agent, account } of _agents.values()) {
    logger.log(`Logging ${account.name} out from Bluesky.`)
    await agent.logout()
  }
  _agents.clear()
}

async function createAgent(account: Account): Promise<AtpAgent> {
  const BSKY_IDENTIFIER = account.credentials.bluesky?.identifier
  const BSKY_PASSWORD = account.credentials.bluesky?.password

  if (!BSKY_IDENTIFIER || !BSKY_PASSWORD) {
    logger.error(
      `Cannot find Bluesky credentials in account ${account.name}(${account.id}).`
    )
    throw new Error('Bluesky credentials are not set in account')
  }

  const agent = new AtpAgent({
    service: 'https://bsky.social',
  })

  // Login to Bluesky with retry logic
  let loginAttempts = 0
  const maxLoginAttempts = 5

  while (loginAttempts < maxLoginAttempts) {
    try {
      await agent.login({
        identifier: BSKY_IDENTIFIER,
        password: BSKY_PASSWORD,
      })
      logger.log('Successfully authenticated with Bluesky.')
      break
    } catch (loginError) {
      loginAttempts++
      logger.error(`Login attempt ${loginAttempts} failed:`, loginError)

      if (loginAttempts >= maxLoginAttempts) {
        throw new Error(
          `Failed to login after ${maxLoginAttempts} attempts: ${
            loginError instanceof Error ? loginError.message : 'Unknown error'
          }`
        )
      }

      // Wait before retrying
      await wait(2000)
    }
  }

  return agent
}

export async function getPostsAsFeedViewPosts(
  account: Account,
  config?: PostFilters,
  useCache: boolean = false
): Promise<FeedViewPost[]> {
  const agent = await getAgent(account)
  // Use cached posts if within cache duration
  if (
    useCache &&
    postCache &&
    cacheDate &&
    Date.now() - cacheDate.getTime() < CACHE_DURATION_MS
  ) {
    logger.log('Using cached posts.')
    return postCache
  }

  await governor.wait()

  const postList: FeedViewPost[] = []

  try {
    const BSKY_IDENTIFIER = account.credentials.bluesky?.identifier

    if (!BSKY_IDENTIFIER) {
      logger.error('Cannot find Bluesky identifier in settings')
      throw new Error('Bluesky identifier is not set in settings')
    }

    let cursor: string | undefined

    do {
      logger.log('Fetching posts with cursor:', cursor)
      const response = await agent.getAuthorFeed({
        actor: BSKY_IDENTIFIER.toLowerCase(),
        cursor,
        limit: 100,
      })
      logger.log(`Fetched ${response.data.feed.length} posts`)

      if (config && config.isComment === true) {
        // Filter out comments/replies, keep only original posts
        response.data.feed = removeOriginalPosts(response.data.feed)
      } else if (config && config.isComment === false) {
        // Filter out original posts, keep only comments/replies
        response.data.feed = removeComments(response.data.feed)
      }

      for (const item of response.data.feed) {
        const post = item.post
        const postDate = new Date(post.indexedAt)

        if (!config?.cutoffDate || postDate < config.cutoffDate) {
          postList.push(item)
        }
      }

      cursor = response.data.cursor
    } while (cursor)

    postCache = postList
    cacheDate = new Date()
  } catch (error) {
    logger.error('Error fetching posts:', error)
    throw new Error(
      `Failed to fetch posts: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    )
  }

  return postList
}

export async function deletePostsWithUris(
  account: Account,
  postUris: string[]
): Promise<void> {
  const agent = await getAgent(account)
  await governor.wait()

  try {
    for (const postUri of postUris) {
      logger.log(`Deleting post: ${postUri}`)
      if (PREVENT_POSTING) {
        logger.log(
          'PREVENT_POSTING is enabled, skipping actual deletion of post.'
        )
        continue
      }
      await agent.deletePost(postUri)
      logger.log(`Successfully deleted post: ${postUri}`)
    }
  } catch (error) {
    logger.error('Error deleting post:', error)
    throw new Error(
      `Failed to delete post: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    )
  }
}

export async function deletePosts(
  account: Account,
  config: PostFilters
): Promise<void> {
  const agent = await getAgent(account)
  await governor.wait()

  const BSKY_IDENTIFIER = account.credentials.bluesky?.identifier

  if (!BSKY_IDENTIFIER) {
    logger.error('Cannot find Bluesky identifier in settings')
    throw new Error('Bluesky identifier is not set in settings')
  }

  if (!config.cutoffDate) {
    throw new Error('cutoffDate is required in config to delete posts')
  }

  try {
    let cursor: string | undefined
    const postsToDelete: string[] = []
    let pageCount = 0

    console.log('Fetching posts to delete...')

    // Fetch posts from the user's timeline
    do {
      try {
        pageCount++
        console.log(`Fetching page ${pageCount}...`)

        const response = await agent.getAuthorFeed({
          actor: BSKY_IDENTIFIER,
          cursor,
          limit: 100,
        })

        if (config.isComment === true) {
          // Filter out comments/replies, keep only original posts
          response.data.feed = removeOriginalPosts(response.data.feed)
        } else if (config.isComment === false) {
          // Filter out original posts, keep only comments/replies
          response.data.feed = removeComments(response.data.feed)
        }

        for (const item of response.data.feed) {
          const post = item.post
          const postDate = new Date(post.indexedAt)

          if (postDate < config.cutoffDate) {
            postsToDelete.push(post.uri)
          }
        }

        cursor = response.data.cursor

        // Add a small delay between requests to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100))
      } catch (fetchError) {
        console.error(`Error fetching page ${pageCount}:`, fetchError)

        // If it's a rate limit or temporary error, wait and retry
        if (
          fetchError instanceof Error &&
          (fetchError.message.includes('rate') ||
            fetchError.message.includes('timeout') ||
            fetchError.message.includes('fetch failed'))
        ) {
          console.log('Retrying after delay...')
          await new Promise((resolve) => setTimeout(resolve, 5000))
          continue
        }

        throw fetchError
      }
    } while (cursor)

    console.log(`Found ${postsToDelete.length} posts to delete`)

    // Delete the old posts
    for (let i = 0; i < postsToDelete.length; i++) {
      const postUri = postsToDelete[i]
      try {
        console.log(
          `Deleting post ${i + 1}/${postsToDelete.length}: ${postUri}`
        )
        await governor.wait(200)
        if (PREVENT_POSTING) {
          logger.log(
            'PREVENT_POSTING is enabled, skipping actual deletion of post.'
          )
          continue
        }
        await agent.deletePost(postUri)

        // Add delay between deletions to avoid rate limiting
        await wait(500)
      } catch (deleteError) {
        logger.error(`Error deleting post ${postUri}:`, deleteError)

        // Continue with other posts even if one fails
        if (
          deleteError instanceof Error &&
          deleteError.message.includes('not found')
        ) {
          console.log('Post already deleted, continuing...')
          continue
        }

        // For other errors, you might want to stop or continue based on your needs
        throw deleteError
      }
    }
  } catch (error) {
    logger.error('Error deleting old posts:', error)
    throw new Error(
      `Failed to delete posts: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    )
  }
}

function removeComments(posts: FeedViewPost[]): FeedViewPost[] {
  return posts.filter((item) => {
    return !item.reply
  })
}

function removeOriginalPosts(posts: FeedViewPost[]): FeedViewPost[] {
  return posts.filter((item) => {
    return !!item.reply
  })
}

export async function addPost(
  post: DraftPost,
  account: Account
): Promise<void> {
  const agent = await getAgent(account)
  await governor.wait()

  try {
    const { draftPostsPath } = await getPaths()
    if (PREVENT_POSTING) {
      logger.log('PREVENT_POSTING is enabled, skipping actual posting.')
      return
    }

    // The correct way to post
    // Upload images first to get BlobRefs
    const uploadedImages = []
    if (post.meta.images && post.meta.images.length > 0) {
      for (const image of post.meta.images) {
        // Assuming image.filename is a file path or buffer
        const parts = [draftPostsPath]
        if (post.group) {
          parts.push(post.group)
        }
        parts.push(post.meta.directoryName, post.meta.mediaDir, image.filename)
        const path = parts.join('/')
        const imageData = await fs.readFile(path)

        let altText = 'Image'
        try {
          // Check for an ImageDescription on the image to set the alt text
          const tags: ExifReader.Tags = ExifReader.load(imageData)
          altText = getAltFromExif(tags) || altText
        } catch (err) {
          logger.log('Could not extract image metadata for alt text:', err)
        }

        await governor.wait(200)
        const uploadResponse = await agent.uploadBlob(imageData, {
          encoding: image.mime || 'image/jpeg',
        })
        uploadedImages.push({
          alt: altText,
          image: uploadResponse.data.blob,
        })
      }
    }

    let uploadedVideo = null
    if (post.meta.video) {
      const videoData = await fs.readFile(post.meta.video.filename)
      await governor.wait(200)
      const uploadResponse = await agent.uploadBlob(videoData, {
        encoding: post.meta.video.mime || 'video/mp4',
      })
      uploadedVideo = {
        alt: 'Video',
        video: uploadResponse.data.blob,
        thumb: uploadedImages[0]?.image || undefined, // Use first image as thumbnail if available
      }
    }

    const richText = new RichText({ text: post.meta.text || '' })
    await richText.detectFacets(agent)

    await governor.wait(200)
    await agent.post({
      text: richText.text,
      createdAt: new Date().toISOString(),
      langs: ['en'],
      facets: richText.facets,
      embed:
        uploadedImages.length > 0
          ? {
              $type: 'app.bsky.embed.images',
              images: uploadedImages,
            }
          : undefined,
      video: uploadedVideo
        ? {
            $type: 'app.bsky.embed.video',
            ...uploadedVideo,
          }
        : undefined,
    })

    console.log(`Successfully added post: ${post.meta.text}`)
  } catch (error) {
    console.error('Error adding post:', error)
    throw error
  }
}

function getAltFromExif(tags: ExifReader.Tags): string | null {
  const getTagValue = (
    tags: ExifReader.Tags,
    tagName: string
  ): string | null => {
    if (tags[tagName]?.value) {
      if (typeof tags[tagName]?.value === 'string') {
        return tags[tagName]?.value as string
      } else if (
        Array.isArray(tags[tagName]?.value) &&
        (tags[tagName]?.value as unknown[]).length > 0 &&
        typeof (tags[tagName]?.value as unknown[])[0] === 'string'
      ) {
        return tags[tagName]?.value[0] as string
      } else if (
        Array.isArray(tags[tagName]?.value) &&
        (tags[tagName]?.value as unknown[]).length > 0
      ) {
        return tags[tagName]?.value[0] // XmpTag[]
      }
    }
    return null
  }

  const title = getTagValue(tags, 'ImageTitle')
  if (title) return title
  const description = getTagValue(tags, 'ImageDescription')
  if (description) return description
  const caption = getTagValue(tags, 'Caption')
  if (caption) return caption
  const altText = getTagValue(tags, 'XPAltText')
  if (altText) return altText
  const headline = getTagValue(tags, 'Headline')
  if (headline) return headline
  const subject = getTagValue(tags, 'Subject')
  if (subject) return subject
  return null
}

/**
 * Download blob data from Bluesky and save it to filesystem
 * @param cid - The blob reference (supports both $link and bytes formats)
 * @param filePath - The file path where the blob should be saved
 * @param did - The DID of the user who owns the blob
 * @returns Promise<boolean> - true if successful, false otherwise
 */
export async function saveBlobToFile(
  account: Account,
  cid: string,
  filePath: string,
  did: string
): Promise<boolean> {
  try {
    const agent = await getAgent(account)

    let success = false
    let response = null
    const MAX_RETRIES = 3
    let attempt = 0

    do {
      attempt++
      try {
        await governor.wait(1000)
        // Download the blob using the AT Protocol
        response = await agent.com.atproto.sync.getBlob({
          cid,
          did,
        })
        success = response?.success || false
      } catch {
        success = false
      }
    } while (!success && attempt < MAX_RETRIES)

    if (!success || !response) {
      logger.error(`Failed to download blob after ${MAX_RETRIES} attempts:`, {
        cid,
        did,
      })
      return false
    }

    if (response.success && response.data) {
      // Ensure directory exists
      const dir = path.dirname(filePath)
      await fs.mkdir(dir, { recursive: true })

      // Save the blob data to file
      await fs.writeFile(filePath, new Uint8Array(response.data))
      logger.log(`Blob saved successfully to ${filePath}`)
      return true
    } else {
      logger.error('Failed to download blob:', response)
      return false
    }
  } catch (error) {
    logger.error('Error downloading blob:', error)
    return false
  }
}
