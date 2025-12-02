/** biome-ignore-all lint/suspicious/noExplicitAny: see code */

import type { Account } from '@/types/accounts'
import type { DraftPost } from '@/types/drafts'
import type { Settings } from '@/types/types'
import { AtpAgent } from '@atproto/api'
import fs from 'node:fs/promises'
import * as blueskyHelpers from '../auth/BlueskyAuth'

const mockAccount: Account = {
  id: 'account1',
  name: 'Test Account',
  platform: 'bluesky',
  isActive: true,
  createdAt: new Date().toISOString(),
  profile: {
    handle: 'testuser',
    displayName: 'Test User',
  },
}

jest.mock('@/app/api-helpers/appData', () => ({
  getAppData: jest.fn().mockResolvedValue({
    lastBackup: null,
    postsOnBsky: 0,
    totalPostsBackedUp: 0,
    oldestBskyPostDate: null,
    schedules: [],
    settings: {
      backupLocation: '/mock/backup',
      pruneAfterMonths: 6,
      hasOnboarded: true,
      accounts: [mockAccount],
    } as Settings,
  }),
  saveAppData: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@/app/api-helpers/logger', () => ({
  __esModule: true,
  default: class {
    warn = jest.fn()
    error = jest.fn()
    log = jest.fn()
  },
}))
jest.mock('@atproto/api')
jest.mock('@/config/main', () => ({
  BSKY_IDENTIFIER: 'testuser',
  BSKY_PASSWORD: 'testpass',
  DRAFT_POSTS_PATH: '/mock/path',
  ENCRYPTION_KEY: 'default_secret_key_32bytes!',
  LOGS_PATH: '/mock/logs',
  APP_DATA_FILE: '/mock/appdata',
  SUPPORTED_SOCIAL_PLATFORMS: ['bluesky'],
  APP_PORT: 3000,
  APP_HOST: 'localhost',
  APP_URL: 'http://localhost:3000',
  CRON_FREQUENCY_MINUTES: 5,
  MINIMUM_MINUTES_BETWEEN_BACKUPS: 5,
  DEFAULT_BACKUP_LOCATION: '/mock/backup',
  DEFAULT_GROUP: 'default',
  DEFAULT_POST_SLUG: 'draft',
  POSTS_PER_PAGE: 20,
  MAX_POSTS: 1000,
  DATE_FORMAT: 'yyyy-MM-dd',
  DATE_TIME_FORMAT: 'yyyy-MM-dd HH:mm:ss',
  DEFAULT_TIMEZONE: 'America/New_York',
  HEADER_NAV_ITEMS: [
    { label: 'Home', href: '/' },
    { label: 'Drafts', href: '/drafts' },
    { label: 'Schedules', href: '/schedules' },
  ],
  getPaths: jest.fn().mockReturnValue({
    mainDataLocation: '/mock/data',
    draftPostsPath: '/mock/draft-posts',
    publishedPostsPath: '/mock/published-posts',
    backupPath: '/mock/backup',
    backupMediaPath: '/mock/backup/media',
    postBackupFile: '/mock/backup/bluesky-posts.json',
  }),
}))
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
}))
jest.mock('@/app/api/services/CredentialService', () => ({
  getCredentials: jest.fn().mockResolvedValue({
    identifier: 'testuser',
    password: 'testpass',
  }),
}))

const mockLogin = jest.fn()
const mockLogout = jest.fn()
const mockGetAuthorFeed = jest.fn()
const mockDeletePost = jest.fn()
const mockUploadBlob = jest.fn()
const mockCreatePost = jest.fn()

;(AtpAgent as any).mockImplementation(() => ({
  login: mockLogin,
  logout: mockLogout,
  getAuthorFeed: mockGetAuthorFeed,
  deletePost: mockDeletePost,
  uploadBlob: mockUploadBlob,
  post: mockCreatePost,
  api: {
    app: {
      bsky: {
        feed: {
          post: mockCreatePost,
        },
      },
    },
  },
}))

describe('bluesky helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockLogin.mockResolvedValue(undefined)
    mockLogout.mockResolvedValue(undefined)
    mockGetAuthorFeed.mockResolvedValue({
      data: {
        feed: [
          {
            post: {
              indexedAt: new Date('2024-01-01T00:00:00Z').toISOString(),
              uri: 'uri1',
            },
            reply: undefined,
          },
          {
            post: {
              indexedAt: new Date('2022-01-01T00:00:00Z').toISOString(),
              uri: 'uri2',
            },
            reply: { root: {}, parent: {} },
          },
        ],
        cursor: undefined,
      },
    })
    mockDeletePost.mockResolvedValue(undefined)
    mockUploadBlob.mockResolvedValue({ data: { blob: { ref: 'blobref' } } })
    mockCreatePost.mockResolvedValue(undefined)
    ;(fs.readFile as jest.Mock).mockResolvedValue(Buffer.from('mock'))
  })

  describe('getPosts', () => {
    it('fetches posts and respects cutoffDate', async () => {
      const posts = await blueskyHelpers.getPostsAsFeedViewPosts(mockAccount, {
        cutoffDate: new Date('2022-06-01'),
      })
      expect(posts.length).toBe(1)
      expect(mockGetAuthorFeed).toHaveBeenCalled()
    })

    it('filters out comments if isComment=true', async () => {
      const posts = await blueskyHelpers.getPostsAsFeedViewPosts(mockAccount, {
        isComment: true,
      })
      expect(posts.length).toBe(1)
      expect(posts[0].reply).toBeDefined()
    })

    it('filters out original posts if isComment=false', async () => {
      const posts = await blueskyHelpers.getPostsAsFeedViewPosts(mockAccount, {
        isComment: false,
      })
      expect(posts.length).toBe(1)
      expect(posts[0].reply).toBeUndefined()
    })
  })

  describe('deletePosts', () => {
    it('deletes posts before cutoffDate', async () => {
      await blueskyHelpers.deletePosts(mockAccount, {
        cutoffDate: new Date('2023-01-01T01:00:00Z'),
      })
      expect(mockDeletePost).not.toHaveBeenCalledWith('uri1')
      expect(mockDeletePost).toHaveBeenCalledWith('uri2')
    })

    it('throws if cutoffDate is missing', async () => {
      await expect(blueskyHelpers.deletePosts(mockAccount, {})).rejects.toThrow(
        'cutoffDate is required',
      )
    })
  })

  describe('addPost', () => {
    it('uploads images and posts', async () => {
      const post: DraftPost = {
        meta: {
          slug: 'id1',
          text: 'Hello @user https://test.com #tag',
          images: [{ filename: 'img.jpg', mime: 'image/jpeg' }],
          mediaDir: 'media',
        },
        group: 'group1',
      } as DraftPost
      await blueskyHelpers.addPost(post, mockAccount)
      expect(mockUploadBlob).toHaveBeenCalled()
      expect(mockCreatePost).toHaveBeenCalled()
    })

    it('uploads video if present', async () => {
      const post: DraftPost = {
        meta: {
          id: 'id2',
          text: 'Video post',
          images: [],
          video: { filename: '/mock/video.mp4', mime: 'video/mp4' },
          mediaDir: 'media',
        },
        group: 'group2',
      } as any
      await blueskyHelpers.addPost(post, mockAccount)
      expect(mockUploadBlob).toHaveBeenCalled()
      expect(mockCreatePost).toHaveBeenCalled()
    })
  })
})
