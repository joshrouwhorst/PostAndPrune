# Threads Integration Implementation Checklist

## Phase 1: Foundation & Types (Week 1)

### ✅ Type System Updates

#### 1.1 Update `src/types/accounts.ts`
- [ ] Extend `SocialPlatform` type to include 'threads'
- [ ] Add OAuth fields to `Credentials` interface
- [ ] Add Threads-specific fields to `Profile` interface
- [ ] Maintain backward compatibility with existing Bluesky accounts

**Sample Implementation:**
```typescript
export type SocialPlatform = 'bluesky' | 'threads'

export interface Credentials {
  // Existing Bluesky fields (keep for backward compatibility)
  identifier?: string
  password?: string
  displayName?: string
  
  // New Threads OAuth fields
  accessToken?: string
  refreshToken?: string
  tokenExpiresAt?: string
  appId?: string
  appSecret?: string
  scopes?: string[]
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
}
```

#### 1.2 Create `src/types/threads.ts`
- [ ] Define Threads API response types
- [ ] Create OAuth flow types
- [ ] Define media container types
- [ ] Add error handling types

**Sample Implementation:**
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
}

// Media Container Types
export interface ThreadsMediaContainer {
  id: string
  status: 'EXPIRED' | 'ERROR' | 'FINISHED' | 'IN_PROGRESS' | 'PUBLISHED'
  error_message?: string
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

// API Response Types
export interface ThreadsAPIResponse<T = any> {
  data: T
  paging?: {
    cursors: {
      before: string
      after: string
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
  }
}

// Media Upload Types
export interface ThreadsMediaUpload {
  media_type: 'IMAGE' | 'VIDEO'
  media_url: string
  alt_text?: string
  is_carousel_item?: boolean
}

// Post Creation Types
export interface CreateThreadsPostData {
  media_type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'
  text?: string
  image_url?: string
  video_url?: string
  children?: string[] // For carousel posts
  is_quote_post?: boolean
  quoted_post_id?: string
  reply_to_id?: string
  reply_control?: 'EVERYONE' | 'ACCOUNTS_YOU_FOLLOW' | 'MENTIONED_ONLY'
  allowlisted_country_codes?: string[]
  location_id?: string
}

// Filter Types (to match existing BlueskyAuth.PostFilters pattern)
export interface ThreadsPostFilters {
  cutoffDate?: Date
  includeReplies?: boolean
  mediaType?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'
  limit?: number
}
```

#### 1.3 Update `src/types/drafts.ts` (if needed)
- [ ] Ensure DraftPost type works with both platforms
- [ ] Add platform-specific metadata fields if needed

### ✅ Configuration Updates

#### 1.4 Update `src/config/main.ts`
- [ ] Add Threads API configuration
- [ ] Add OAuth configuration options

**Sample Implementation:**
```typescript
// Add to existing config
export const THREADS_CONFIG = {
  API_BASE_URL: process.env.THREADS_API_BASE_URL || 'https://graph.threads.net',
  APP_ID: process.env.THREADS_APP_ID,
  APP_SECRET: process.env.THREADS_APP_SECRET,
  REDIRECT_URI: process.env.THREADS_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/auth/threads/callback`,
  SCOPES: ['threads_basic', 'threads_content_publish', 'threads_manage_replies'],
  TOKEN_REFRESH_THRESHOLD: 5 * 60 * 1000, // Refresh if expires in 5 minutes
}

// Validation
if (process.env.NODE_ENV === 'production') {
  if (!THREADS_CONFIG.APP_ID || !THREADS_CONFIG.APP_SECRET) {
    console.warn('Threads API credentials not configured - Threads features will be disabled')
  }
}
```

#### 1.5 Update Environment Variables
- [ ] Document new environment variables in README
- [ ] Add to .env.example file
- [ ] Update deployment configuration

**Required Environment Variables:**
```bash
# Threads API Configuration
THREADS_APP_ID=your_threads_app_id
THREADS_APP_SECRET=your_threads_app_secret
THREADS_REDIRECT_URI=https://your-domain.com/api/auth/threads/callback
THREADS_API_BASE_URL=https://graph.threads.net
```

### ✅ Validation & Testing

#### 1.6 Type Safety Validation
- [ ] Ensure all existing Bluesky code still type-checks
- [ ] Verify new types are properly exported
- [ ] Test TypeScript compilation

#### 1.7 Database Schema Considerations
- [ ] Verify existing account storage handles new credential fields
- [ ] Test credential encryption/decryption with new fields
- [ ] Plan for data migration if needed

---

## Phase 2: Authentication Layer (Week 2)

### ✅ ThreadsAuth Module Setup

#### 2.1 Create `src/app/api-helpers/auth/ThreadsAuth.ts`
- [ ] Set up module structure with all required exports
- [ ] Implement OAuth URL generation
- [ ] Create token exchange functionality
- [ ] Add token refresh logic
- [ ] Implement basic error handling

**Basic Module Structure:**
```typescript
import type { Account, Credentials } from '@/types/accounts'
import type { DraftPost } from '@/types/drafts'
import type { 
  ThreadsOAuthTokens, 
  ThreadsUser, 
  ThreadsPost, 
  ThreadsPostFilters 
} from '@/types/threads'
import Logger from '../logger'

const logger = new Logger('ThreadsAuth')

// OAuth Implementation
export function generateAuthURL(state?: string): string { /* ... */ }
export async function exchangeCodeForTokens(code: string, state?: string): Promise<ThreadsOAuthTokens> { /* ... */ }
export async function refreshAccessToken(account: Account): Promise<ThreadsOAuthTokens> { /* ... */ }

// User Management
export async function getAccountInfo(account: Account): Promise<ThreadsUser> { /* ... */ }
export async function testConnection(account: Account): Promise<boolean> { /* ... */ }

// Post Management
export async function getPosts(account: Account, config?: ThreadsPostFilters): Promise<ThreadsPost[]> { /* ... */ }
export async function addPost(post: DraftPost, account: Account): Promise<void> { /* ... */ }
export async function deletePost(account: Account, postId: string): Promise<void> { /* ... */ }

// Media Handling
export async function uploadMedia(mediaBuffer: Buffer, mediaType: 'image' | 'video'): Promise<string> { /* ... */ }

// Session Management
export async function logout(account: Account): Promise<void> { /* ... */ }
export async function logoutAll(): Promise<void> { /* ... */ }
```

#### 2.2 OAuth Flow Implementation
- [ ] Create authorization URL generator
- [ ] Implement code exchange endpoint
- [ ] Add token refresh functionality
- [ ] Handle OAuth errors gracefully

#### 2.3 API Client Setup
- [ ] Create HTTP client with proper headers
- [ ] Implement rate limiting
- [ ] Add retry logic for failed requests
- [ ] Set up request/response logging

### ✅ API Routes for OAuth

#### 2.4 Create OAuth API Endpoints
- [ ] `GET /api/auth/threads/authorize` - Initiate OAuth flow
- [ ] `GET /api/auth/threads/callback` - Handle OAuth callback
- [ ] `POST /api/auth/threads/refresh` - Refresh tokens
- [ ] `DELETE /api/auth/threads/revoke` - Revoke tokens

#### 2.5 Media Upload Infrastructure
- [ ] Set up public URL serving for media
- [ ] Implement temporary file storage
- [ ] Add cleanup for expired media
- [ ] Handle media format validation

---

## Phase 3: Platform Integration (Week 3)

### ✅ AuthManager Updates

#### 3.1 Update `src/app/api-helpers/auth/AuthManager.ts`
- [ ] Add ThreadsAuth import
- [ ] Update all switch statements for 'threads' case
- [ ] Add proper error handling for unsupported operations
- [ ] Maintain type safety

#### 3.2 Service Layer Updates
- [ ] Update `SettingsService.ts` for Threads account handling
- [ ] Update `DraftPostService.ts` for Threads publishing
- [ ] Update `BackupService.ts` for Threads post fetching
- [ ] Test credential storage with OAuth tokens

### ✅ Data Transformers

#### 3.3 Create Threads Data Transformers
- [ ] `transformThreadsPostToDisplayData.ts`
- [ ] `transformDraftToThreadsPost.ts`
- [ ] Handle media URL transformations
- [ ] Map Threads post types to internal format

---

## Phase 4: UI & User Experience (Week 4)

### ✅ Account Management UI

#### 4.1 Update Account Setup Flow
- [ ] Add Threads option to platform selector
- [ ] Create OAuth setup component
- [ ] Handle OAuth callback in UI
- [ ] Show connection status and token expiry

#### 4.2 Publishing Interface Updates
- [ ] Show platform selection in draft editor
- [ ] Display platform-specific validation
- [ ] Handle cross-platform posting
- [ ] Show publish status per platform

### ✅ Error Handling & UX

#### 4.3 User-Friendly Error Messages
- [ ] OAuth failure handling
- [ ] Token expiry notifications
- [ ] API rate limit messages
- [ ] Media upload error feedback

---

## Phase 5: Testing & Production Readiness (Week 5)

### ✅ Testing Strategy

#### 5.1 Unit Tests
- [ ] ThreadsAuth module functions
- [ ] OAuth flow components
- [ ] Data transformers
- [ ] Error handling scenarios

#### 5.2 Integration Tests
- [ ] Full OAuth flow
- [ ] Post publishing to both platforms
- [ ] Media upload and publishing
- [ ] Account management workflows

#### 5.3 End-to-End Tests
- [ ] Complete user journey from account setup to posting
- [ ] Cross-platform scheduling
- [ ] Error recovery scenarios
- [ ] Performance under load

### ✅ Production Deployment

#### 5.4 App Review Preparation
- [ ] Complete Threads App Review requirements
- [ ] Document API usage and compliance
- [ ] Prepare demo video and screenshots
- [ ] Set up production OAuth callbacks

#### 5.5 Monitoring & Observability
- [ ] Add comprehensive logging
- [ ] Set up error tracking
- [ ] Monitor API rate limits
- [ ] Track OAuth token health

---

## Testing Checklist

### Core Functionality Tests
- [ ] Users can add Threads accounts via OAuth
- [ ] Users can post text-only content to Threads
- [ ] Users can post images to Threads
- [ ] Users can post videos to Threads
- [ ] Users can cross-post to both Bluesky and Threads
- [ ] Token refresh works automatically
- [ ] Error handling provides clear user feedback
- [ ] Existing Bluesky functionality remains unchanged

### Edge Cases
- [ ] Expired token handling during posting
- [ ] Network failures during OAuth flow
- [ ] Invalid media format handling
- [ ] API rate limit responses
- [ ] Large media file handling
- [ ] Concurrent posting to multiple platforms

### Security Tests
- [ ] Tokens are stored encrypted
- [ ] OAuth state parameter validation
- [ ] Proper token scoping
- [ ] Secure credential handling
- [ ] No token leakage in logs

### Performance Tests
- [ ] OAuth flow completes within reasonable time
- [ ] Media upload performance is acceptable
- [ ] No performance regression on existing features
- [ ] Memory usage is reasonable with multiple accounts

---

## Deployment Checklist

### Pre-Deployment
- [ ] All environment variables configured
- [ ] Threads app approved by Meta (if needed)
- [ ] OAuth redirect URLs configured correctly
- [ ] SSL certificates valid for OAuth callbacks
- [ ] Database migration completed (if needed)

### Post-Deployment
- [ ] OAuth flow working in production
- [ ] Post publishing successful
- [ ] Media uploads functional
- [ ] Error monitoring active
- [ ] User feedback collection in place

### Rollback Plan
- [ ] Feature flag to disable Threads support
- [ ] Database rollback scripts ready
- [ ] Monitoring for increased error rates
- [ ] Communication plan for users

This checklist provides a comprehensive guide for implementing Threads integration while maintaining the stability and reliability of the existing Bluesky functionality.