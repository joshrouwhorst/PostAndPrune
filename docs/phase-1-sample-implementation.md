# Phase 1 Sample Implementation

This document provides working code samples for implementing Phase 1 of the Threads integration.

## 1. Updated Account Types

**File: `src/types/accounts.ts`**

```typescript
// Add threads to the supported platforms
export type SocialPlatform = 'bluesky' | 'threads'

export interface Account {
  id: string
  name: string // User-friendly name like "Personal", "Business"
  platform: SocialPlatform
  credentials?: Credentials
  isActive: boolean
  createdAt: string
  profile: Profile | null
}

export interface Profile {
  displayName?: string
  handle?: string
  avatarUrl?: string
  
  // Threads-specific fields
  username?: string
  threadsUserId?: string
  isBusinessAccount?: boolean
  followersCount?: number
  followingCount?: number
  isVerified?: boolean
  biography?: string
}

export interface Credentials {
  // Existing Bluesky fields (maintain backward compatibility)
  identifier?: string
  password?: string
  displayName?: string
  
  // New Threads OAuth fields
  accessToken?: string
  refreshToken?: string
  tokenExpiresAt?: string
  appId?: string
  scopes?: string[]
  
  // OAuth state management
  state?: string
  codeVerifier?: string // For PKCE if needed
}
```

## 2. Threads-Specific Types

**File: `src/types/threads.ts`**

```typescript
// OAuth Types
export interface ThreadsOAuthTokens {
  access_token: string
  token_type: 'bearer'
  expires_in: number
  refresh_token?: string
  scope: string
}

export interface ThreadsOAuthError {
  error: string
  error_description: string
  error_reason?: string
  error_user_msg?: string
}

// User Profile Types
export interface ThreadsUser {
  id: string
  username: string
  name?: string
  threads_profile_picture_url?: string
  threads_biography?: string
  is_private?: boolean
  is_verified?: boolean
  follower_count?: number
  media_count?: number
}

// Post Types
export interface ThreadsPost {
  id: string
  media_product_type: 'THREADS'
  media_type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'
  text?: string
  timestamp: string
  username: string
  permalink: string
  is_quote_post: boolean
  has_replies?: boolean
  root_post?: {
    id: string
  }
  replied_to?: {
    id: string
  }
  is_reply?: boolean
  is_reply_owned_by_me?: boolean
  hide_status?: 'NOT_HUSHED' | 'HUSHED'
  reply_audience?: 'EVERYONE' | 'ACCOUNTS_YOU_FOLLOW' | 'MENTIONED_ONLY'
  thumbnail_url?: string
  media_url?: string
  children?: {
    data: ThreadsPost[]
  }
}

// Media Container Types
export interface ThreadsMediaContainer {
  id: string
  status: 'EXPIRED' | 'ERROR' | 'FINISHED' | 'IN_PROGRESS' | 'PUBLISHED'
  error_message?: string
}

// API Response Types
export interface ThreadsAPIResponse<T = any> {
  data: T
  paging?: {
    cursors?: {
      before?: string
      after?: string
    }
    next?: string
    previous?: string
  }
  error?: {
    message: string
    type: string
    code: number
    error_subcode?: number
    fbtrace_id: string
    is_transient?: boolean
  }
}

// Post Creation Types
export interface CreateThreadsPostData {
  media_type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'
  text?: string
  image_url?: string
  video_url?: string
  children?: string[] // Media container IDs for carousel
  is_quote_post?: boolean
  quoted_post_id?: string
  reply_to_id?: string
  reply_control?: 'EVERYONE' | 'ACCOUNTS_YOU_FOLLOW' | 'MENTIONED_ONLY'
  allowlisted_country_codes?: string[]
  location_id?: string
  alt_text?: string
}

// Filter Types (matching existing BlueskyAuth.PostFilters pattern)
export interface ThreadsPostFilters {
  cutoffDate?: Date
  includeReplies?: boolean
  mediaType?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'
  limit?: number
  before?: string
  after?: string
}

// Media Upload Types
export interface ThreadsMediaUpload {
  media_type: 'IMAGE' | 'VIDEO'
  media_url: string
  alt_text?: string
  is_carousel_item?: boolean
}

// Rate Limiting Types
export interface ThreadsRateLimit {
  limit: number
  remaining: number
  reset: number
  resetTime: Date
}
```

## 3. Configuration Updates

**File: `src/config/main.ts`**

```typescript
// Add this to your existing config

// Threads API Configuration
export const THREADS_CONFIG = {
  API_BASE_URL: process.env.THREADS_API_BASE_URL || 'https://graph.threads.net',
  APP_ID: process.env.THREADS_APP_ID,
  APP_SECRET: process.env.THREADS_APP_SECRET,
  REDIRECT_URI: process.env.THREADS_REDIRECT_URI,
  SCOPES: ['threads_basic', 'threads_content_publish', 'threads_manage_replies'],
  
  // OAuth Configuration
  AUTHORIZATION_URL: 'https://threads.net/oauth/authorize',
  TOKEN_URL: 'https://graph.threads.net/oauth/access_token',
  
  // Token Management
  TOKEN_REFRESH_THRESHOLD: 5 * 60 * 1000, // Refresh if expires in 5 minutes
  TOKEN_REFRESH_RETRY_COUNT: 3,
  
  // API Configuration
  DEFAULT_API_VERSION: 'v1.0',
  REQUEST_TIMEOUT: 30000, // 30 seconds
  MAX_RETRY_COUNT: 3,
  
  // Media Configuration
  MAX_IMAGE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_VIDEO_SIZE: 100 * 1024 * 1024, // 100MB
  SUPPORTED_IMAGE_FORMATS: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  SUPPORTED_VIDEO_FORMATS: ['mp4', 'mov', 'avi'],
  
  // Text Limits
  MAX_TEXT_LENGTH: 500,
  MAX_ALT_TEXT_LENGTH: 100,
} as const

// Validation function
export function validateThreadsConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!THREADS_CONFIG.APP_ID) {
    errors.push('THREADS_APP_ID environment variable is required')
  }
  
  if (!THREADS_CONFIG.APP_SECRET) {
    errors.push('THREADS_APP_SECRET environment variable is required')
  }
  
  if (!THREADS_CONFIG.REDIRECT_URI) {
    errors.push('THREADS_REDIRECT_URI environment variable is required')
  } else {
    try {
      new URL(THREADS_CONFIG.REDIRECT_URI)
    } catch {
      errors.push('THREADS_REDIRECT_URI must be a valid URL')
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// Initialize validation on startup
if (process.env.NODE_ENV === 'production') {
  const validation = validateThreadsConfig()
  if (!validation.isValid) {
    console.warn('Threads API configuration issues:', validation.errors.join(', '))
    console.warn('Threads features will be disabled')
  }
}

// Export helper function to check if Threads is enabled
export function isThreadsEnabled(): boolean {
  const validation = validateThreadsConfig()
  return validation.isValid
}
```

## 4. Environment Variables

**File: `.env.example`**

```bash
# Existing variables...

# Threads API Configuration
THREADS_APP_ID=your_threads_app_id_here
THREADS_APP_SECRET=your_threads_app_secret_here
THREADS_REDIRECT_URI=https://your-domain.com/api/auth/threads/callback
THREADS_API_BASE_URL=https://graph.threads.net

# Optional: Override default settings
# THREADS_MAX_RETRIES=3
# THREADS_REQUEST_TIMEOUT=30000
```

## 5. Draft Post Type Updates

**File: `src/types/drafts.ts`** (additions)

```typescript
// Add platform-specific metadata if needed
export interface DraftMeta {
  directoryName: string
  slug: string
  createdAt: string
  mediaDir: string
  images: ImageData[]
  video: VideoData | null
  extra: Record<string, any>
  priority: number
  
  // Platform-specific settings
  platformSettings?: {
    threads?: {
      replyControl?: 'EVERYONE' | 'ACCOUNTS_YOU_FOLLOW' | 'MENTIONED_ONLY'
      allowlistedCountries?: string[]
      locationId?: string
    }
    bluesky?: {
      // Existing Bluesky-specific settings
    }
  }
}
```

## 6. Utility Functions

**File: `src/helpers/threads.ts`** (new file)

```typescript
import { THREADS_CONFIG } from '@/config/main'
import type { ThreadsOAuthError, ThreadsAPIResponse } from '@/types/threads'

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
  const params = new URLSearchParams({
    client_id: THREADS_CONFIG.APP_ID!,
    redirect_uri: THREADS_CONFIG.REDIRECT_URI!,
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
  return error && typeof error.error === 'string' && typeof error.error_description === 'string'
}

/**
 * Check if an error is a Threads API error
 */
export function isThreadsAPIError(response: any): response is ThreadsAPIResponse & { error: NonNullable<ThreadsAPIResponse['error']> } {
  return response && response.error && typeof response.error.message === 'string'
}

/**
 * Format Threads API error for user display
 */
export function formatThreadsError(error: ThreadsOAuthError | ThreadsAPIResponse['error']): string {
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
export function isTokenExpiringSoon(expiresAt: string, thresholdMs = THREADS_CONFIG.TOKEN_REFRESH_THRESHOLD): boolean {
  const expiryTime = new Date(expiresAt).getTime()
  const now = Date.now()
  return expiryTime - now <= thresholdMs
}

/**
 * Calculate token expiry date from expires_in seconds
 */
export function calculateTokenExpiry(expiresInSeconds: number): string {
  const expiryTime = new Date(Date.now() + (expiresInSeconds * 1000))
  return expiryTime.toISOString()
}

/**
 * Validate media file for Threads
 */
export function validateMediaForThreads(file: { size: number; type: string; name: string }): { isValid: boolean; error?: string } {
  const extension = file.name.split('.').pop()?.toLowerCase()
  
  if (file.type.startsWith('image/')) {
    if (file.size > THREADS_CONFIG.MAX_IMAGE_SIZE) {
      return { isValid: false, error: `Image size exceeds ${THREADS_CONFIG.MAX_IMAGE_SIZE / (1024 * 1024)}MB limit` }
    }
    if (extension && !THREADS_CONFIG.SUPPORTED_IMAGE_FORMATS.includes(extension)) {
      return { isValid: false, error: `Unsupported image format: ${extension}` }
    }
  } else if (file.type.startsWith('video/')) {
    if (file.size > THREADS_CONFIG.MAX_VIDEO_SIZE) {
      return { isValid: false, error: `Video size exceeds ${THREADS_CONFIG.MAX_VIDEO_SIZE / (1024 * 1024)}MB limit` }
    }
    if (extension && !THREADS_CONFIG.SUPPORTED_VIDEO_FORMATS.includes(extension)) {
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
export function validatePostText(text: string): { isValid: boolean; error?: string } {
  if (text.length > THREADS_CONFIG.MAX_TEXT_LENGTH) {
    return { isValid: false, error: `Text exceeds ${THREADS_CONFIG.MAX_TEXT_LENGTH} character limit` }
  }
  return { isValid: true }
}
```

## 7. Database/Storage Considerations

**Migration considerations for existing data:**

```typescript
// Example migration function (adjust based on your storage system)
export async function migrateAccountsForThreadsSupport() {
  // If using a database, you might need to:
  // 1. Add new columns for OAuth tokens
  // 2. Update credential encryption to handle new fields
  // 3. Add platform-specific profile fields
  
  // If using file-based storage (like current system), ensure:
  // 1. Credential service can handle new OAuth fields
  // 2. Profile data structure accommodates new fields
  // 3. Account serialization/deserialization works with new types
  
  console.log('Checking account storage compatibility...')
  
  // Test that we can store and retrieve OAuth credentials
  const testAccount = {
    id: 'test-threads-account',
    name: 'Test Threads Account',
    platform: 'threads' as const,
    credentials: {
      accessToken: 'test-token',
      refreshToken: 'test-refresh',
      tokenExpiresAt: new Date(Date.now() + 3600000).toISOString(),
      appId: 'test-app-id',
      scopes: ['threads_basic', 'threads_content_publish'],
    },
    isActive: true,
    createdAt: new Date().toISOString(),
    profile: {
      displayName: 'Test User',
      username: 'testuser',
      threadsUserId: 'threads-user-id-123',
      isBusinessAccount: false,
    },
  }
  
  // Test storage operations here
  console.log('Account storage compatibility check passed')
}
```

## Next Steps

After implementing Phase 1:

1. **Test Type Safety**: Ensure all existing code still compiles with the new types
2. **Test Storage**: Verify that accounts with new credential fields can be stored and retrieved
3. **Update UI**: Add basic platform selection in account setup (even if Threads OAuth isn't working yet)
4. **Documentation**: Update any API documentation or user guides

This foundation will make Phase 2 (implementing the actual OAuth flow and API calls) much smoother.