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
