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
