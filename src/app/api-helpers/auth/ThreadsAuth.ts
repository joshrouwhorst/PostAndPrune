import { getCache, setCache } from '@/app/api/services/CacheService'
import CredentialService from '@/app/api/services/CredentialService'
import type { PostDisplayData } from '@/components/Post'
import { THREADS_CONFIG, validateThreadsConfig } from '@/config/main'
import {
  calculateTokenExpiry,
  formatThreadsError,
  generateOAuthState,
  isThreadsAPIError,
  isThreadsOAuthError,
  isTokenExpiringSoon,
} from '@/helpers/threads'
import { transformDraftToThreadsPost } from '@/transformers/transformDraftToThreadsPost'
import { transformThreadsPostToDisplayData } from '@/transformers/transformThreadsPostToDisplayData'
import type { Account, Credentials, Profile } from '@/types/accounts'
import type { DraftPost } from '@/types/drafts'
import type {
  ThreadsAPIResponse,
  ThreadsMediaContainer,
  ThreadsOAuthTokens,
  ThreadsPost,
  ThreadsPostFilters,
  ThreadsUser,
} from '@/types/threads'
import { Governor } from '../governor'
import Logger from '../logger'

const logger = new Logger('ThreadsAuth')
const governor = new Governor(1000) // Rate limiting

// Cache management
function cacheId(accountId: string) {
  return `threads-cache-${accountId}`
}

const CACHE_DURATION_MS = 5 * 60 * 1000 // 5 minutes

// Token storage for active sessions
const _tokens: Map<
  string,
  {
    tokens: ThreadsOAuthTokens
    account: Account
    credentials: Credentials
    expiresAt: Date
  }
> = new Map()

/**
 * Generate OAuth authorization URL for Threads
 */
export function generateAuthURL(state?: string): string {
  console.log('Generating Threads authorization URL')
  console.log('THREADS_CONFIG:', THREADS_CONFIG)
  const validation = validateThreadsConfig()
  if (!validation.isValid) {
    throw new Error(
      `Threads configuration invalid: ${validation.errors.join(', ')}`,
    )
  }

  const oauthState = state || generateOAuthState()

  // Threads OAuth: include both app_id (preferred) and client_id for compatibility
  const params = new URLSearchParams({
    app_id: THREADS_CONFIG.APP_ID!,
    client_id: THREADS_CONFIG.APP_ID!,
    redirect_uri: THREADS_CONFIG.REDIRECT_URI!,
    scope: THREADS_CONFIG.SCOPES.join(','),
    response_type: 'code',
    state: oauthState,
  })

  const authUrl = `${THREADS_CONFIG.AUTHORIZATION_URL}?${params.toString()}`
  console.log('Generated Threads auth URL:', authUrl)
  return authUrl
}

/**
 * Exchange authorization code for access tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  state?: string,
): Promise<ThreadsOAuthTokens> {
  const validation = validateThreadsConfig()
  if (!validation.isValid) {
    throw new Error(
      `Threads configuration invalid: ${validation.errors.join(', ')}`,
    )
  }

  await governor.wait()

  const params = new URLSearchParams({
    client_id: THREADS_CONFIG.APP_ID!,
    client_secret: THREADS_CONFIG.APP_SECRET!,
    grant_type: 'authorization_code',
    redirect_uri: THREADS_CONFIG.REDIRECT_URI!,
    code,
  })

  try {
    const response = await fetch(THREADS_CONFIG.TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    const data = await response.json()

    if (!response.ok) {
      if (isThreadsOAuthError(data)) {
        throw new Error(formatThreadsError(data))
      }
      throw new Error(`Token exchange failed: ${response.status}`)
    }

    logger.log('Successfully exchanged code for tokens')
    return data as ThreadsOAuthTokens
  } catch (error) {
    logger.error('Failed to exchange authorization code:', error)
    throw error
  }
}

/**
 * Refresh an expired access token
 */
export async function refreshAccessToken(
  account: Account,
): Promise<ThreadsOAuthTokens> {
  const credentials = await CredentialService.getCredentials(account)
  if (!credentials?.refreshToken) {
    throw new Error('No refresh token available for account')
  }

  await governor.wait()

  const params = new URLSearchParams({
    client_id: THREADS_CONFIG.APP_ID!,
    client_secret: THREADS_CONFIG.APP_SECRET!,
    grant_type: 'refresh_token',
    refresh_token: credentials.refreshToken,
  })

  try {
    const response = await fetch(THREADS_CONFIG.TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    const data = await response.json()

    if (!response.ok) {
      if (isThreadsOAuthError(data)) {
        throw new Error(formatThreadsError(data))
      }
      throw new Error(`Token refresh failed: ${response.status}`)
    }

    // Update stored credentials with new tokens
    const newCredentials: Credentials = {
      ...credentials,
      accessToken: data.access_token,
      refreshToken: data.refresh_token || credentials.refreshToken,
      tokenExpiresAt: calculateTokenExpiry(data.expires_in),
    }

    await CredentialService.setCredentials(account, newCredentials)

    // Update token cache
    _tokens.set(account.id, {
      tokens: data,
      account,
      credentials: newCredentials,
      expiresAt: new Date(newCredentials.tokenExpiresAt!),
    })

    logger.log(`Refreshed tokens for account ${account.id}`)
    return data as ThreadsOAuthTokens
  } catch (error) {
    logger.error('Failed to refresh access token:', error)
    throw error
  }
}

/**
 * Get valid access token for account (refreshing if needed)
 */
async function getValidToken(account: Account): Promise<string> {
  const credentials = await CredentialService.getCredentials(account)
  if (!credentials?.accessToken) {
    throw new Error('No access token found for account')
  }

  // Check if token is expiring soon
  if (
    credentials.tokenExpiresAt &&
    isTokenExpiringSoon(credentials.tokenExpiresAt)
  ) {
    logger.log(`Token expiring soon for account ${account.id}, refreshing...`)
    const newTokens = await refreshAccessToken(account)
    return newTokens.access_token
  }

  return credentials.accessToken
}

/**
 * Make authenticated API request to Threads
 */
async function makeAuthenticatedRequest<T = any>(
  account: Account,
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const accessToken = await getValidToken(account)

  await governor.wait()

  const url = `${THREADS_CONFIG.API_BASE_URL}/${THREADS_CONFIG.DEFAULT_API_VERSION}/${endpoint}`

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  const data = await response.json()

  if (!response.ok) {
    if (isThreadsAPIError(data)) {
      throw new Error(formatThreadsError(data.error))
    }
    throw new Error(`API request failed: ${response.status}`)
  }

  return data
}

/**
 * Get account profile information
 */
export async function getAccountInfo(account: Account): Promise<Profile> {
  try {
    const data = await makeAuthenticatedRequest<
      ThreadsAPIResponse<ThreadsUser>
    >(
      account,
      'me?fields=id,username,name,threads_profile_picture_url,threads_biography,is_verified,follower_count',
    )

    const user = data.data

    return {
      displayName: user.name || user.username,
      username: user.username,
      threadsUserId: user.id,
      avatarUrl: user.threads_profile_picture_url,
      biography: user.threads_biography,
      isVerified: user.is_verified,
      followersCount: user.follower_count,
      isBusinessAccount: false, // Will need to determine this from another endpoint if needed
    }
  } catch (error) {
    logger.error('Failed to get account info:', error)
    throw new Error(
      `Failed to get account information: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }
}

/**
 * Test account connection
 */
export async function testConnection(account: Account): Promise<boolean> {
  try {
    await getAccountInfo(account)
    return true
  } catch (error) {
    logger.error(`Connection test failed for account ${account.id}:`, error)
    return false
  }
}

/**
 * Get posts for an account
 */
export async function getPosts(
  account: Account,
  config?: ThreadsPostFilters,
  useCache: boolean = false,
): Promise<PostDisplayData[]> {
  const cacheKey = cacheId(account.id)

  if (useCache) {
    const cached = getCache<PostDisplayData[]>(cacheKey)
    if (cached) {
      logger.log(`Returning cached posts for account ${account.id}`)
      return cached
    }
  }

  try {
    let fields =
      'id,media_product_type,media_type,text,timestamp,username,permalink,is_quote_post'
    if (config?.includeReplies) {
      fields += ',has_replies,is_reply,replied_to'
    }

    let endpoint = `me/threads?fields=${fields}`
    if (config?.limit) {
      endpoint += `&limit=${config.limit}`
    }
    if (config?.before) {
      endpoint += `&before=${config.before}`
    }
    if (config?.after) {
      endpoint += `&after=${config.after}`
    }

    const response = await makeAuthenticatedRequest<
      ThreadsAPIResponse<ThreadsPost[]>
    >(account, endpoint)

    let posts = response.data || []

    // Apply filters
    if (config?.cutoffDate) {
      posts = posts.filter(
        (post) => new Date(post.timestamp) >= config.cutoffDate!,
      )
    }

    if (config?.mediaType) {
      posts = posts.filter((post) => post.media_type === config.mediaType)
    }

    // Transform to display data
    const displayData = posts.map((post) =>
      transformThreadsPostToDisplayData(post),
    )

    // Cache the results
    setCache(cacheKey, displayData, CACHE_DURATION_MS)

    logger.log(
      `Retrieved ${displayData.length} posts for account ${account.id}`,
    )
    return displayData
  } catch (error) {
    logger.error('Failed to get posts:', error)
    throw new Error(
      `Failed to get posts: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }
}

/**
 * Read media file from draft post directory
 */
async function readMediaFile(
  post: DraftPost,
  filename: string,
): Promise<Buffer> {
  const fs = await import('node:fs/promises')
  const path = await import('node:path')
  const { getPaths } = await import('@/config/main')

  const { draftPostsPath } = getPaths()
  const mediaPath = path.join(draftPostsPath, post.meta.directoryName, filename)

  try {
    return await fs.readFile(mediaPath)
  } catch (error) {
    throw new Error(
      `Failed to read media file ${filename}: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }
}

/**
 * Upload media to a publicly accessible URL using the local upload API
 */
async function uploadMediaToPublicUrl(
  mediaBuffer: Buffer,
  mediaType: 'image' | 'video',
  altText?: string,
): Promise<string> {
  try {
    // Create form data for the upload
    const formData = new FormData()
    const uint8Array = new Uint8Array(mediaBuffer)
    const blob = new Blob([uint8Array])
    formData.append(
      'file',
      blob,
      `upload.${mediaType === 'image' ? 'jpg' : 'mp4'}`,
    )
    formData.append('mediaType', mediaType)
    if (altText) {
      formData.append('altText', altText)
    }

    // Upload to local media API
    const response = await fetch('/api/media/upload', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      throw new Error(
        `Upload failed: ${response.status} ${response.statusText}`,
      )
    }

    const result = await response.json()
    if (!result.success) {
      throw new Error(result.error || 'Upload failed')
    }

    logger.log(`Successfully uploaded ${mediaType} to ${result.publicUrl}`)
    return result.publicUrl
  } catch (error) {
    logger.error(`Failed to upload ${mediaType}:`, error)
    throw new Error(
      `Media upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }
}

/**
 * Create a media container for posting
 */
async function createMediaContainer(
  account: Account,
  mediaUrl: string,
  mediaType: 'IMAGE' | 'VIDEO',
  altText?: string,
): Promise<string> {
  const postData: any = {
    media_type: mediaType,
    media_url: mediaUrl,
  }

  if (altText) {
    postData.alt_text = altText
  }

  const response = await makeAuthenticatedRequest<
    ThreadsAPIResponse<ThreadsMediaContainer>
  >(account, 'me/threads', {
    method: 'POST',
    body: JSON.stringify(postData),
  })

  return response.data.id
}

/**
 * Publish a post to Threads
 */
export async function addPost(
  post: DraftPost,
  account: Account,
): Promise<void> {
  try {
    logger.log(`Publishing post to Threads for account ${account.name}`)

    // Transform draft to Threads post format
    let threadsPost = transformDraftToThreadsPost(post)

    // Handle media uploads if present
    if (post.meta.images && post.meta.images.length > 0) {
      logger.log(`Uploading ${post.meta.images.length} images...`)

      if (post.meta.images.length === 1) {
        // Single image
        const image = post.meta.images[0]
        const imageBuffer = await readMediaFile(post, image.filename)
        const publicUrl = await uploadMediaToPublicUrl(imageBuffer, 'image')

        const containerId = await createMediaContainer(
          account,
          publicUrl,
          'IMAGE',
        )
        threadsPost = {
          ...threadsPost,
          media_type: 'IMAGE',
          image_url: containerId, // Threads expects container ID here
        }
      } else {
        // Multiple images - carousel
        const containerIds: string[] = []

        for (const image of post.meta.images) {
          const imageBuffer = await readMediaFile(post, image.filename)
          const publicUrl = await uploadMediaToPublicUrl(imageBuffer, 'image')
          const containerId = await createMediaContainer(
            account,
            publicUrl,
            'IMAGE',
          )
          containerIds.push(containerId)
        }

        threadsPost = {
          ...threadsPost,
          media_type: 'CAROUSEL_ALBUM',
          children: containerIds,
        }
      }
    } else if (post.meta.video) {
      // Single video
      logger.log('Uploading video...')
      const videoBuffer = await readMediaFile(post, post.meta.video.filename)
      const publicUrl = await uploadMediaToPublicUrl(videoBuffer, 'video')

      const containerId = await createMediaContainer(
        account,
        publicUrl,
        'VIDEO',
      )
      threadsPost = {
        ...threadsPost,
        media_type: 'VIDEO',
        video_url: containerId, // Threads expects container ID here
      }
    }

    // Create the post container
    const containerResponse = await makeAuthenticatedRequest<
      ThreadsAPIResponse<ThreadsMediaContainer>
    >(account, 'me/threads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(threadsPost),
    })

    const postContainerId = containerResponse.data.id

    // Publish the post
    const publishResponse = await makeAuthenticatedRequest<
      ThreadsAPIResponse<{ id: string }>
    >(account, 'me/threads_publish', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        creation_id: postContainerId,
      }),
    })

    logger.log(
      `Successfully published post to Threads with ID: ${publishResponse.data.id}`,
    )

    // Invalidate cache
    const cacheKey = cacheId(account.id)
    setCache(cacheKey, null, 0)
  } catch (error) {
    logger.error('Failed to publish post to Threads:', error)
    throw new Error(
      `Failed to publish to Threads: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    )
  }
}

/**
 * Delete a post from Threads
 */
export async function deletePost(
  account: Account,
  postId: string,
): Promise<void> {
  try {
    await makeAuthenticatedRequest(account, postId, {
      method: 'DELETE',
    })

    logger.log(`Successfully deleted post ${postId} from Threads`)

    // Invalidate cache
    const cacheKey = cacheId(account.id)
    setCache(cacheKey, null, 0)
  } catch (error) {
    logger.error('Failed to delete post from Threads:', error)
    throw new Error(
      `Failed to delete post: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }
}

/**
 * Logout from account
 */
export async function logout(account: Account): Promise<void> {
  _tokens.delete(account.id)
  logger.log(`Logged out from Threads account ${account.id}`)
}

/**
 * Logout from all accounts
 */
export async function logoutAll(): Promise<void> {
  _tokens.clear()
  logger.log('Logged out from all Threads accounts')
}

// Re-export PostFilters type for convenience
export type { ThreadsPostFilters as PostFilters }
