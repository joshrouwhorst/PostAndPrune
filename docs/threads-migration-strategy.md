# Threads API Integration Migration Strategy

## Executive Summary

This document outlines a comprehensive strategy for integrating Threads API support into the existing social media management application, which currently supports Bluesky. The migration will leverage the existing platform abstraction architecture to add Threads as a second supported platform.

## Current Architecture Analysis

### Existing Platform Support (Bluesky)
- **Authentication**: AtpAgent-based authentication with identifier/password
- **API Client**: `@atproto/api` package for Bluesky interactions
- **Account Management**: Multi-account support with credential storage
- **Platform Abstraction**: AuthManager with switch-based routing
- **Post Publishing**: Draft system with media handling (images/videos)
- **Backup & Retrieval**: Post fetching and local storage
- **Scheduling**: Cron-based automated posting system

### Key Components
```
src/
├── types/accounts.ts          # Account types and interfaces
├── app/api-helpers/auth/
│   ├── AuthManager.ts         # Platform abstraction layer
│   └── BlueskyAuth.ts         # Bluesky-specific implementation
├── app/api/services/
│   ├── SettingsService.ts     # Account management
│   ├── DraftPostService.ts    # Post creation and publishing
│   └── CredentialService.ts   # Secure credential storage
└── transformers/              # Data transformation utilities
```

## Threads API Overview

### Authentication Model
- **OAuth 2.0**: Standard web-based OAuth flow
- **Permissions**: 
  - `threads_basic` (required for all endpoints)
  - `threads_content_publish` (required for posting)
  - `threads_manage_replies` (for reply management)
- **Token Types**:
  - Short-lived tokens (1 hour)
  - Long-lived tokens (60 days, refreshable)
  - App-scoped tokens unique per user/app pair

### API Endpoints
- **Base URL**: `graph.threads.com` or `graph.threads.net`
- **Publishing**: Two-step process (create container → publish)
- **Media Support**: Images, videos, carousels
- **Content Types**: Text posts, media posts, quote posts, reposts

### Key Differences from Bluesky
1. **Authentication**: OAuth vs credentials-based
2. **Publishing Flow**: Container-based vs direct posting
3. **Media Handling**: URL-based vs blob upload
4. **API Structure**: RESTful Graph API vs ATProto

## Migration Strategy

### Phase 1: Foundation & Types (Week 1)

#### 1.1 Update Type Definitions
**File: `src/types/accounts.ts`**
```typescript
// Extend SocialPlatform type
export type SocialPlatform = 'bluesky' | 'threads'

// Update Credentials interface for OAuth support
export interface Credentials {
  // Existing Bluesky fields
  identifier?: string
  password?: string
  displayName?: string
  
  // New Threads OAuth fields
  accessToken?: string
  refreshToken?: string
  tokenExpiresAt?: string
  appId?: string
  appSecret?: string
}

// Add Threads-specific profile fields
export interface Profile {
  displayName?: string
  handle?: string
  avatarUrl?: string
  
  // Threads-specific fields
  username?: string
  threadsUserId?: string
  isBusinessAccount?: boolean
}
```

#### 1.2 Create Threads-Specific Types
**File: `src/types/threads.ts`**
```typescript
// Threads API types
export interface ThreadsMediaContainer {
  id: string
  status: 'EXPIRED' | 'ERROR' | 'FINISHED' | 'IN_PROGRESS' | 'PUBLISHED'
  error_message?: string
}

export interface ThreadsPost {
  id: string
  media_product_type: 'THREADS'
  media_type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'
  text?: string
  timestamp: string
  username: string
  permalink: string
  is_quote_post: boolean
}

export interface ThreadsOAuthTokens {
  access_token: string
  token_type: 'bearer'
  expires_in?: number
  refresh_token?: string
}
```

### Phase 2: Authentication Layer (Week 2)

#### 2.1 Create ThreadsAuth Module
**File: `src/app/api-helpers/auth/ThreadsAuth.ts`**

Key functions to implement:
- `initializeOAuth()`: Handle OAuth flow initiation
- `exchangeCodeForTokens()`: Convert auth code to tokens
- `refreshAccessToken()`: Refresh expired tokens
- `getProfile()`: Fetch user profile information
- `createMediaContainer()`: Create post container
- `publishPost()`: Publish container to Threads
- `getPosts()`: Retrieve user's posts
- `uploadMedia()`: Handle media upload to public URLs
- `deletePost()`: Remove posts
- `logout()`: Clear tokens and sessions

#### 2.2 OAuth Flow Implementation
1. **Authorization URL Generation**
2. **Callback Handler** (new API route: `/api/auth/threads/callback`)
3. **Token Management** with automatic refresh
4. **Secure Token Storage** integration with CredentialService

#### 2.3 Media Handling Strategy
Threads requires publicly accessible URLs for media. Options:
1. **Temporary Upload Service**: Use existing `/api/images/` route
2. **Cloud Storage Integration**: AWS S3, Cloudinary, etc.
3. **Local Server with Public Access**: Ensure media is accessible via HTTP

### Phase 3: Platform Integration (Week 3)

#### 3.1 Update AuthManager
**File: `src/app/api-helpers/auth/AuthManager.ts`**

Extend all switch statements to handle 'threads' platform:
```typescript
export async function getPosts(account: Account, config?: PostFilters, useCache?: boolean) {
  switch (account.platform) {
    case 'bluesky':
      return BlueskyAuth.getPostsAsFeedViewPosts(account, config, useCache)
    case 'threads':
      return ThreadsAuth.getPosts(account, config, useCache)
    default:
      throw new Error(`Unsupported platform: ${account.platform}`)
  }
}

export async function addPost(post: DraftPost, account: Account) {
  switch (account.platform) {
    case 'bluesky':
      return BlueskyAuth.addPost(post, account)
    case 'threads':
      return ThreadsAuth.addPost(post, account)
    default:
      throw new Error(`Unsupported platform: ${account.platform}`)
  }
}
```

#### 3.2 Update SettingsService
**File: `src/app/api/services/SettingsService.ts`**

Add Threads account handling:
```typescript
export async function addAccount(account: Account) {
  account.id = generateId()
  
  if (account.credentials) {
    CredentialService.setCredentials(account, account.credentials)
  }

  if (account.platform === 'bluesky') {
    const profile = await getBskyAccountInfo(account)
    account.profile = profile
  } else if (account.platform === 'threads') {
    const profile = await getThreadsAccountInfo(account)
    account.profile = profile
  }
}
```

#### 3.3 Data Transformation
**File: `src/transformers/transformThreadsPostToDisplayData.ts`**

Create transformer to convert Threads API responses to internal DisplayData format, similar to existing Bluesky transformers.

### Phase 4: API Routes & UI (Week 4)

#### 4.1 OAuth API Routes
- **GET `/api/auth/threads/authorize`**: Initiate OAuth flow
- **GET `/api/auth/threads/callback`**: Handle OAuth callback
- **POST `/api/auth/threads/refresh`**: Refresh access tokens
- **DELETE `/api/auth/threads/logout`**: Revoke tokens

#### 4.2 Update Account Management UI
**Files to modify:**
- `src/components/AccountSelector.tsx`: Support Threads accounts
- `src/app/settings/page.tsx`: Add Threads account setup
- Platform-specific account setup forms

#### 4.3 Publishing Interface Updates
Ensure draft publishing interface supports:
- Platform selection (Bluesky + Threads)
- Platform-specific validation
- Error handling for OAuth issues
- Token refresh notifications

### Phase 5: Testing & Validation (Week 5)

#### 5.1 Development Setup
1. Create Threads App in Meta Developer Console
2. Configure OAuth redirect URLs for development
3. Set up test accounts with appropriate permissions
4. Implement comprehensive error handling

#### 5.2 Testing Strategy
- **Unit Tests**: ThreadsAuth module functions
- **Integration Tests**: OAuth flow, post publishing
- **Multi-Platform Tests**: Cross-posting to both platforms
- **Error Scenarios**: Token expiration, API rate limits
- **Media Handling**: Image/video uploads

#### 5.3 Backward Compatibility
- Ensure existing Bluesky functionality remains unchanged
- Graceful handling of mixed-platform scenarios
- Database migration for existing accounts

## Implementation Considerations

### Security
- **Token Storage**: Secure encryption for OAuth tokens
- **Environment Variables**: App secrets in environment config
- **HTTPS Requirements**: OAuth callbacks must use HTTPS
- **Token Refresh**: Automatic handling of expired tokens

### Rate Limiting
- **API Limits**: Respect Threads API rate limits
- **Governor Pattern**: Extend existing rate limiting system
- **Retry Logic**: Exponential backoff for failed requests

### Media Handling
- **Public URLs**: Ensure media is accessible via public HTTP(S)
- **Temporary Storage**: Clean up uploaded media after posting
- **Format Support**: Validate supported image/video formats
- **Size Limits**: Respect Threads media size restrictions

### Error Handling
- **OAuth Errors**: Clear user messaging for auth failures
- **API Errors**: Proper error codes and user feedback
- **Fallback Strategies**: Graceful degradation when APIs fail
- **Logging**: Comprehensive error logging for debugging

### Configuration Management
- **Environment Variables**:
  ```
  THREADS_APP_ID=your_app_id
  THREADS_APP_SECRET=your_app_secret
  THREADS_REDIRECT_URI=https://your-app.com/api/auth/threads/callback
  ```
- **Feature Flags**: Toggle Threads support during development

## Migration Timeline

| Week | Phase | Deliverables |
|------|-------|-------------|
| 1 | Foundation & Types | Updated type definitions, basic structure |
| 2 | Authentication Layer | ThreadsAuth module, OAuth implementation |
| 3 | Platform Integration | AuthManager updates, service integrations |
| 4 | API Routes & UI | OAuth routes, UI updates, publishing interface |
| 5 | Testing & Validation | Comprehensive testing, production readiness |

## Risk Mitigation

### Technical Risks
- **OAuth Complexity**: Start with simple test implementation
- **Media URL Requirements**: Implement robust public URL system
- **API Changes**: Monitor Threads API changelog for updates
- **Token Management**: Implement comprehensive refresh logic

### User Experience Risks
- **Account Setup Complexity**: Provide clear setup documentation
- **Cross-Platform Confusion**: Clear platform indicators in UI
- **Error Recovery**: Graceful handling of authentication issues

### Business Risks
- **API Approval**: Threads API requires app review for production
- **Rate Limits**: May need usage monitoring and user limits
- **Platform Changes**: Keep implementation modular for easier updates

## Success Metrics

1. **Successful OAuth Flow**: Users can authenticate with Threads
2. **Post Publishing**: Cross-posting to both platforms works reliably
3. **Media Support**: Images and videos upload and display correctly
4. **Account Management**: Multiple Threads accounts supported
5. **Backward Compatibility**: Existing Bluesky users unaffected
6. **Performance**: No degradation in existing functionality

## Future Enhancements

### Phase 6+ Considerations
- **Advanced Features**: Quote posts, reposts, reply management
- **Insights Integration**: Threads analytics and metrics
- **Webhook Support**: Real-time notifications
- **Advanced Scheduling**: Platform-specific scheduling options
- **Content Optimization**: Platform-specific content suggestions

## Conclusion

This migration strategy provides a structured approach to adding Threads support while maintaining the existing Bluesky functionality. The phased approach allows for iterative development and testing, ensuring a stable and reliable multi-platform social media management solution.

The existing architecture's platform abstraction makes this integration straightforward, requiring primarily the addition of a new authentication module and updates to existing switch statements throughout the codebase.