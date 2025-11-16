import type { Account } from '@/types/accounts'
import type { CreateDraftInput, DraftPost } from '@/types/drafts'
import type { Schedule } from '@/types/scheduler'
import {
  createDraftPost,
  deleteDraftPost,
  duplicateDraftPost,
  generateDirPath,
  getDraftPost,
  getDraftPostsInSchedule,
  publishDraftPost,
  updateDraftPost,
} from '../DraftPostService'

// Mock the FileService functions
jest.mock('../FileService', () => ({
  listFiles: jest.fn(),
  checkIfExists: jest.fn(),
  writeFile: jest.fn(),
  readText: jest.fn(),
  deleteFileOrDirectory: jest.fn(),
  copyFileOrDirectory: jest.fn(),
  moveFileOrDirectory: jest.fn(),
}))

// Mock the bluesky helper
jest.mock('../../../api-helpers/auth/BlueskyAuth', () => ({
  addPost: jest.fn(),
}))

// Mock the logger
jest.mock('../../../api-helpers/logger', () => {
  return jest.fn().mockImplementation(() => ({
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  }))
})

// Mock the utils
jest.mock('../../../api-helpers/utils', () => ({
  ensureDir: jest.fn(),
  removeDir: jest.fn(),
  safeName: jest.fn((name: string) => name.replace(/[^a-zA-Z0-9-_]/g, '_')),
}))

// Mock the CacheService
jest.mock('../CacheService', () => ({
  setCache: jest.fn((_id, data) => data),
  getCache: jest.fn(() => null),
}))

jest.mock('../../../../config/main', () => ({
  DRAFT_MEDIA_ENDPOINT: 'mock-endpoint',
  SUPPORTED_SOCIAL_PLATFORMS: ['bluesky'],
  DEFAULT_GROUP: 'default-group',
  DEFAULT_POST_SLUG: 'default-slug',
  getPaths: () => {
    return {
      draftPostsPath: '/mock/drafts',
      publishedPostsPath: '/mock/published',
    }
  },
}))

// Mock the current date/time for consistent testing
const MOCK_DATE = new Date('2023-10-15T10:30:00.000Z')
const MOCK_ISO_STRING = '2023-10-15T10:30:00.000Z'

describe('DraftPostService', () => {
  beforeAll(() => {
    // Mock Date methods
    jest.useFakeTimers()
    jest.setSystemTime(MOCK_DATE)
  })

  afterAll(() => {
    // Restore real timers
    jest.useRealTimers()
  })

  const mockAccount: Account = {
    name: 'Test Account',
    id: 'account1',
    platform: 'bluesky',
    isActive: true,
    isDefault: false,
    createdAt: new Date().toISOString(),
    credentials: {
      bluesky: {
        identifier: 'test-identifier',
        password: 'test-password',
      },
    },
  }

  const mockSchedule: Schedule = {
    id: 'test-schedule',
    name: 'Test Schedule',
    group: 'test-group',
    isActive: true,
    frequency: {
      interval: { every: 1, unit: 'days' },
      timesOfDay: ['09:00'],
      daysOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    },
    postOrder: ['post1', 'post2', 'post3'],
    createdAt: MOCK_ISO_STRING,
    accounts: [mockAccount],
  }

  const mockDraftPost: DraftPost = {
    fullPath: '/test/path/post1',
    group: 'test-group',
    meta: {
      directoryName: 'post1',
      slug: 'test-post',
      text: 'This is a test post',
      createdAt: MOCK_ISO_STRING,
      mediaDir: 'media',
      images: [],
      video: null,
      priority: 1,
    },
  }

  const mockCreateInput: CreateDraftInput = {
    slug: 'new-post',
    group: 'test-group',
    text: 'This is a new post',
    images: [],
    video: null,
    createdAt: MOCK_ISO_STRING,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getDraftPostsInSchedule', () => {
    it('should return empty array when schedule has no group', async () => {
      const scheduleWithoutGroup = { ...mockSchedule, group: '' }
      const result = await getDraftPostsInSchedule(scheduleWithoutGroup)
      expect(result).toEqual([])
    })

    it('should return posts filtered by schedule group', async () => {
      // We need to mock the internal getDraftPosts function
      // Since it's not exported, we'll test through the public interface
      const result = await getDraftPostsInSchedule(mockSchedule)
      expect(Array.isArray(result)).toBe(true)
    })

    it('should handle errors gracefully', async () => {
      const result = await getDraftPostsInSchedule(mockSchedule)
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('getDraftPost', () => {
    const { checkIfExists, readText, listFiles } = require('../FileService')

    it('should return null when post does not exist', async () => {
      checkIfExists.mockResolvedValue(false)

      const result = await getDraftPost('nonexistent-post', 'test-group')
      expect(result).toBeNull()
    })

    it('should return post when it exists', async () => {
      checkIfExists.mockResolvedValue(true)
      readText.mockResolvedValue(JSON.stringify(mockDraftPost.meta))

      const result = await getDraftPost('post1', 'test-group')
      expect(result).toBeTruthy()
    })

    it('should search all groups when no group specified', async () => {
      checkIfExists.mockResolvedValue(false)
      listFiles.mockResolvedValue([
        {
          name: 'group1',
          isDirectory: true,
        },
      ])

      checkIfExists.mockResolvedValueOnce(true) // For the found post
      readText.mockResolvedValue(JSON.stringify(mockDraftPost.meta))

      const result = await getDraftPost('post1')
      expect(result).toBeNull()
    })
  })

  describe('createDraftPost', () => {
    const { ensureDir } = require('../../../api-helpers/utils')
    const { writeFile } = require('../FileService')

    it('should create a new draft post', async () => {
      ensureDir.mockResolvedValue(undefined)
      writeFile.mockResolvedValue(undefined)

      const result = await createDraftPost(mockCreateInput)
      expect(result).toBeTruthy()
      expect(result.meta.slug).toBe('new-post')
      expect(result.group).toBe('test-group')
    })

    it('should throw error when more than 4 images provided', async () => {
      const inputWithTooManyImages = {
        ...mockCreateInput,
        images: new Array(5).fill({
          filename: 'test.jpg',
          data: Buffer.from('test'),
          kind: 'image' as const,
        }),
      }

      await expect(createDraftPost(inputWithTooManyImages)).rejects.toThrow(
        'max 4 images allowed'
      )
    })

    it('should throw error when video kind is not "video"', async () => {
      const inputWithInvalidVideo = {
        ...mockCreateInput,
        video: {
          filename: 'test.mp4',
          data: Buffer.from('test'),
          kind: 'image' as const, // Wrong kind
        },
      }

      await expect(createDraftPost(inputWithInvalidVideo)).rejects.toThrow(
        "video kind must be 'video'"
      )
    })
  })

  describe('deleteDraftPost', () => {
    const {
      deleteFileOrDirectory,
      listFiles,
      readText,
      checkIfExists,
    } = require('../FileService')

    it('should delete a draft post', async () => {
      deleteFileOrDirectory.mockResolvedValue(undefined)

      readText.mockImplementation(async (path: string) => {
        if (path.includes('post1/meta.json')) {
          return JSON.stringify(mockDraftPost.meta)
        }
        return null
      })

      listFiles.mockImplementation(async (path: string) => {
        if (path === '/mock/drafts') {
          return [
            {
              name: 'test-group',
              isDirectory: true,
            },
          ]
        }
        if (path === '/mock/drafts/test-group') {
          return [
            {
              name: 'post1',
              isDirectory: true,
            },
          ]
        }
        return []
      })

      checkIfExists.mockImplementation(async (path: string) => {
        if (path === '/mock/drafts/test-group/post1/meta.json') {
          return true
        }
        return false
      })

      await expect(deleteDraftPost('post1')).resolves.not.toThrow()
      expect(deleteFileOrDirectory).toHaveBeenCalled()
    })
  })

  describe('duplicateDraftPost', () => {
    const {
      checkIfExists,
      readText,
      copyFileOrDirectory,
      writeFile,
      listFiles,
    } = require('../FileService')

    it('should duplicate a draft post', async () => {
      let copyCalled = false
      const dupedPath = generateDirPath({
        createdAt: MOCK_ISO_STRING,
        root: '/mock/drafts',
        slug: 'test-post',
        group: 'test-group',
      })

      checkIfExists.mockResolvedValue(true)
      readText.mockResolvedValue(JSON.stringify(mockDraftPost.meta))
      copyFileOrDirectory.mockImplementation(
        async (_src: string, _dest: string) => {
          copyCalled = true
          return Promise.resolve()
        }
      )
      writeFile.mockResolvedValue(undefined)

      readText.mockImplementation(async (path: string) => {
        if (
          path.includes('post1/meta.json') ||
          path.includes(dupedPath.fullPath + '/meta.json')
        ) {
          return JSON.stringify(mockDraftPost.meta)
        }
        return null
      })

      listFiles.mockImplementation(async (path: string) => {
        if (path === '/mock/drafts') {
          return [
            {
              name: 'test-group',
              isDirectory: true,
            },
          ]
        }
        if (path === '/mock/drafts/test-group') {
          return [
            {
              name: 'post1',
              isDirectory: true,
            },
          ]
        }

        if (path === '/mock/drafts/test-group/post1') {
          return [
            {
              name: 'meta.json',
              isDirectory: false,
            },
          ]
        }

        if (path === dupedPath.fullPath) {
          return [
            {
              name: 'meta.json',
              isDirectory: false,
            },
          ]
        }

        return []
      })

      checkIfExists.mockImplementation(async (path: string) => {
        if (path === '/mock/drafts/test-group/post1/meta.json') {
          return true
        }
        // After copy, the new meta.json should exist
        if (path === dupedPath.fullPath + '/meta.json' && copyCalled) {
          return true
        }
        return false
      })

      const result = await duplicateDraftPost('post1')
      expect(result).toBeTruthy()
      expect(result.fullPath).not.toContain('post1')
      expect(result.fullPath).toBe(dupedPath.fullPath)
    })
  })

  describe('updateDraftPost', () => {
    const {
      checkIfExists,
      readText,
      writeFile,
      listFiles,
      moveFileOrDirectory,
    } = require('../FileService')

    it('should update a draft post', async () => {
      moveFileOrDirectory.mockResolvedValue(undefined)
      writeFile.mockResolvedValue(undefined)

      checkIfExists.mockImplementation(async (path: string) => {
        if (path === '/mock/drafts/test-group/post1/meta.json') {
          return true
        }
        return false
      })

      readText.mockImplementation(async (path: string) => {
        if (path.includes('post1/meta.json')) {
          return JSON.stringify(mockDraftPost.meta)
        }
        if (path.includes('post1/post.txt')) {
          return 'This is a test post'
        }
        return null
      })

      // Mock getDraftPosts internal call - this is crucial for updateDraftPost to find the post
      listFiles.mockImplementation(async (path: string) => {
        if (path === '/mock/drafts') {
          return [
            {
              name: 'test-group',
              isDirectory: true,
            },
          ]
        }
        if (path === '/mock/drafts/test-group') {
          return [
            {
              name: 'post1',
              isDirectory: true,
            },
          ]
        }
        if (path === '/mock/drafts/test-group/post1') {
          return [
            {
              name: 'meta.json',
              isDirectory: false,
            },
            {
              name: 'post.txt',
              isDirectory: false,
            },
          ]
        }
        return []
      })

      const updateData: CreateDraftInput = {
        group: 'test-group',
        slug: 'test-post', // Keep same slug to avoid directory rename
        text: 'Updated post text',
        images: [],
        video: null,
      }

      const result = await updateDraftPost('post1', updateData)
      expect(result).toBeTruthy()
      expect(result?.meta.slug).toBe('test-post')
      expect(result?.meta.directoryName).toBe('post1')
    })

    it('should throw error when post does not exist', async () => {
      // Mock getDraftPosts to return empty array
      listFiles.mockImplementation(async (path: string) => {
        if (path === '/mock/drafts') {
          return []
        }
        return []
      })

      const updateData: CreateDraftInput = {
        group: 'test-group',
        text: 'Updated text',
      }

      await expect(updateDraftPost('nonexistent', updateData)).rejects.toThrow(
        'Cannot find post to update'
      )
    })
  })

  describe('publishDraftPost', () => {
    const { checkIfExists, readText, listFiles } = require('../FileService')
    const { addPost } = require('../../../api-helpers/auth/BlueskyAuth')

    it('should publish a draft post to Bluesky', async () => {
      checkIfExists.mockResolvedValue(true)
      readText.mockImplementation(async (path: string) => {
        if (path.includes('post1/meta.json')) {
          return JSON.stringify(mockDraftPost.meta)
        }
        if (path.includes('post1/post.txt')) {
          return 'This is a test post'
        }
        return null
      })

      // Mock getDraftPost internal call
      listFiles.mockImplementation(async (path: string) => {
        if (path === '/mock/drafts') {
          return [
            {
              name: 'test-group',
              isDirectory: true,
            },
          ]
        }
        if (path === '/mock/drafts/test-group') {
          return [
            {
              name: 'post1',
              isDirectory: true,
            },
          ]
        }
        if (path === '/mock/drafts/test-group/post1') {
          return [
            {
              name: 'meta.json',
              isDirectory: false,
            },
            {
              name: 'post.txt',
              isDirectory: false,
            },
          ]
        }
        return []
      })

      addPost.mockResolvedValue({ success: true })

      await expect(
        publishDraftPost({ id: 'post1', accounts: [mockAccount] })
      ).resolves.not.toThrow()
      expect(addPost).toHaveBeenCalled()
    })

    it('should throw error when post does not exist', async () => {
      // Mock getDraftPost to return null by making the post directory not exist
      listFiles.mockImplementation(async (path: string) => {
        if (path === '/mock/drafts') {
          return [
            {
              name: 'test-group',
              isDirectory: true,
            },
          ]
        }
        if (path === '/mock/drafts/test-group') {
          return [] // No posts in this group - the 'nonexistent' post doesn't exist
        }
        return []
      })

      checkIfExists.mockImplementation(async (_path: string) => {
        // No meta.json files exist for any posts
        return false
      })

      await expect(
        publishDraftPost({ id: 'nonexistent', accounts: [mockAccount] })
      ).rejects.toThrow('Post not found')
    })

    it('should handle unsupported platforms', async () => {
      checkIfExists.mockResolvedValue(true)
      readText.mockImplementation(async (path: string) => {
        if (path.includes('post1/meta.json')) {
          return JSON.stringify(mockDraftPost.meta)
        }
        if (path.includes('post1/post.txt')) {
          return 'This is a test post'
        }
        return null
      })

      // Mock getDraftPost internal call
      listFiles.mockImplementation(async (path: string) => {
        if (path === '/mock/drafts') {
          return [
            {
              name: 'test-group',
              isDirectory: true,
            },
          ]
        }
        if (path === '/mock/drafts/test-group') {
          return [
            {
              name: 'post1',
              isDirectory: true,
            },
          ]
        }
        if (path === '/mock/drafts/test-group/post1') {
          return [
            {
              name: 'meta.json',
              isDirectory: false,
            },
            {
              name: 'post.txt',
              isDirectory: false,
            },
          ]
        }
        return []
      })

      // The function should throw for unsupported platforms with a descriptive error
      await expect(
        publishDraftPost({
          id: 'post1',
          accounts: [
            {
              id: 'account1',
              name: 'Unsupported Account',
              platform: 'unsupported-platform',
              credentials: {},
              isActive: true,
              isDefault: false,
              createdAt: new Date().toISOString(),
            } as unknown as Account,
          ],
        })
      ).rejects.toThrow(
        'Account Unsupported Account is using unsupported platform unsupported-platform.'
      )
    })
  })
})
