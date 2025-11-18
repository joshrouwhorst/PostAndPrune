export type SocialPlatform = 'bluesky' // Extendable to more platforms

export interface Account {
  id: string
  name: string // User-friendly name like "Personal", "Business"
  platform: SocialPlatform
  credentials: PlatformCredentials
  isActive: boolean
  createdAt: string
}

export interface PlatformCredentials {
  bluesky?: {
    identifier: string
    password: string
    displayName?: string
  }
  mastodon?: {
    instanceUrl: string
    accessToken: string
    displayName?: string
  }
  // Add more platforms as needed
}
