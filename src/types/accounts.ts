export type SocialPlatform = 'bluesky' // Extendable to more platforms

export interface Account {
  id: string
  name: string // User-friendly name like "Personal", "Business"
  platform: SocialPlatform
  credentials?: Credentials
  isActive: boolean
  createdAt: string
  profile: Profile
}

export interface Profile {
  handle: string
  displayName?: string
  avatar?: string | null
}

export interface Credentials {
  identifier: string
  password: string
  displayName?: string
}
