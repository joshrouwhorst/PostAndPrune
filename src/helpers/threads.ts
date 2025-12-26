import { THREADS_CONFIG } from '@/config/main'
import type { ThreadsAPIResponse, ThreadsOAuthError } from '@/types/threads'

/**
 * Generate a secure random state parameter for OAuth
 */
export function generateOAuthState(): string {
  return crypto.randomUUID()
}

/**
 * Generate OAuth authorization URL
 */
export function generateAuthURL(state: string): string {
  if (!THREADS_CONFIG.APP_ID || !THREADS_CONFIG.REDIRECT_URI) {
    throw new Error(
      'Threads configuration is incomplete. Please check THREADS_APP_ID and THREADS_REDIRECT_URI environment variables.',
    )
  }

  const params = new URLSearchParams({
    client_id: THREADS_CONFIG.APP_ID,
    redirect_uri: THREADS_CONFIG.REDIRECT_URI,
    scope: THREADS_CONFIG.SCOPES.join(','),
    response_type: 'code',
    state,
  })

  return `${THREADS_CONFIG.AUTHORIZATION_URL}?${params.toString()}`
}

/**
 * Check if an error is a Threads OAuth error
 */
export function isThreadsOAuthError(error: any): error is ThreadsOAuthError {
  return (
    error &&
    typeof error.error === 'string' &&
    typeof error.error_description === 'string'
  )
}

/**
 * Check if an error is a Threads API error
 */
export function isThreadsAPIError(
  response: any,
): response is ThreadsAPIResponse & {
  error: NonNullable<ThreadsAPIResponse['error']>
} {
  return (
    response && response.error && typeof response.error.message === 'string'
  )
}

/**
 * Format Threads API error for user display
 */
export function formatThreadsError(
  error?: ThreadsOAuthError | ThreadsAPIResponse['error'],
): string {
  if (!error) {
    return 'An unknown error occurred'
  }
  
  if ('error_description' in error) {
    // OAuth error
    return error.error_user_msg || error.error_description || error.error
  } else if ('message' in error) {
    // API error
    return error.message
  }
  return 'An unknown error occurred'
}

/**
 * Check if a token is expired or will expire soon
 */
export function isTokenExpiringSoon(
  expiresAt: string,
  thresholdMs = THREADS_CONFIG.TOKEN_REFRESH_THRESHOLD,
): boolean {
  const expiryTime = new Date(expiresAt).getTime()
  const now = Date.now()
  return expiryTime - now <= thresholdMs
}

/**
 * Calculate token expiry date from expires_in seconds
 */
export function calculateTokenExpiry(expiresInSeconds: number): string {
  const expiryTime = new Date(Date.now() + expiresInSeconds * 1000)
  return expiryTime.toISOString()
}

/**
 * Validate media file for Threads
 */
export function validateMediaForThreads(file: {
  size: number
  type: string
  name: string
}): { isValid: boolean; error?: string } {
  const extension = file.name.split('.').pop()?.toLowerCase()

  if (file.type.startsWith('image/')) {
    if (file.size > THREADS_CONFIG.MAX_IMAGE_SIZE) {
      return {
        isValid: false,
        error: `Image size exceeds ${THREADS_CONFIG.MAX_IMAGE_SIZE / (1024 * 1024)}MB limit`,
      }
    }
    if (
      extension &&
      !(THREADS_CONFIG.SUPPORTED_IMAGE_FORMATS as readonly string[]).includes(extension)
    ) {
      return { isValid: false, error: `Unsupported image format: ${extension}` }
    }
  } else if (file.type.startsWith('video/')) {
    if (file.size > THREADS_CONFIG.MAX_VIDEO_SIZE) {
      return {
        isValid: false,
        error: `Video size exceeds ${THREADS_CONFIG.MAX_VIDEO_SIZE / (1024 * 1024)}MB limit`,
      }
    }
    if (
      extension &&
      !(THREADS_CONFIG.SUPPORTED_VIDEO_FORMATS as readonly string[]).includes(extension)
    ) {
      return { isValid: false, error: `Unsupported video format: ${extension}` }
    }
  } else {
    return { isValid: false, error: 'File must be an image or video' }
  }

  return { isValid: true }
}

/**
 * Validate post text for Threads
 */
export function validatePostText(text: string): {
  isValid: boolean
  error?: string
} {
  if (text.length > THREADS_CONFIG.MAX_TEXT_LENGTH) {
    return {
      isValid: false,
      error: `Text exceeds ${THREADS_CONFIG.MAX_TEXT_LENGTH} character limit`,
    }
  }
  return { isValid: true }
}
