/** biome-ignore-all lint/suspicious/noExplicitAny: see code */
export type MediaKind = 'image' | 'video'

export type DraftMediaFileInput = {
  filename: string // original filename (used for extension)
  data: Buffer | Uint8Array // file contents (Buffer for server, Uint8Array for client)
  buffer?: Buffer
  arrayBuffer?: ArrayBuffer
  intArray?: Uint8Array
  base64?: string
  kind: MediaKind
  mime?: string // optional mime type
}

export type CreateDraftInput = {
  slug?: string // optional custom slug; otherwise generated
  group: string // group identifier for the post
  text?: string
  images?: DraftMediaFileInput[] // up to 4
  video?: DraftMediaFileInput | null // optional short video
  createdAt?: string // ISO string; defaults to now
  extra?: Record<string, any> // any other small metadata
}

export type DraftMedia = {
  filename: string // original filename (used for extension)
  mime?: string // optional mime type
  kind: MediaKind
  width: number
  height: number
  size: number // file size in bytes
  url?: string
}

export type DraftMeta = {
  directoryName: string // Unique and includes slug
  slug: string // Not necessarily unique
  text?: string
  createdAt: string
  mediaDir: string // relative path under post directory
  images: DraftMedia[]
  video?: DraftMedia | null
  extra?: Record<string, any>
  priority: number // for ordering posts in a group

  // Platform-specific settings
  platformSettings?: {
    threads?: {
      replyControl?: 'EVERYONE' | 'ACCOUNTS_YOU_FOLLOW' | 'MENTIONED_ONLY'
      allowlistedCountries?: string[]
      locationId?: string
    }
    bluesky?: {
      // Existing Bluesky-specific settings can be added here in the future
      langs?: string[]
    }
  }
}

export type DraftPost = {
  fullPath: string // full path on disk for the post
  group: string // group identifier for the post
  meta: DraftMeta
}
