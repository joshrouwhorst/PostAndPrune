export type SocialPlatform = 'bluesky' // Extendable to more platforms

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
}

export interface Credentials {
  identifier: string
  password: string
  displayName?: string
}
