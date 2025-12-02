import * as appDataHelper from '@/app/api-helpers/appData'
import type { Account } from '@/types/accounts'
import type { Schedule, ScheduleFrequency } from '@/types/scheduler'
import * as BackupService from '../BackupService'
import { backupIfNeeded, postIfNeeded, pruneIfNeeded } from '../CronService'

jest.mock('@/config/main', () => ({
  DEFAULT_GROUP: 'default',
  APP_DATA_FILE: './test-app-data.json',
  ENCRYPTION_KEY: 'test-encryption-key',
  getPaths() {
    return {
      mainDataLocation: './data',
      draftPostsPath: './data/draft-posts',
      publishedPostsPath: './data/published-posts',
      backupPath: './data/backup',
      backupMediaPath: './data/backup/media',
      postBackupFile: './data/backup/bluesky-posts.json',
    }
  },
}))
jest.mock('@/app/api-helpers/logger', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    log: jest.fn(),
    error: jest.fn(),
  })),
}))
jest.mock('@/app/api-helpers/appData')
jest.mock('@/app/api/services/BackupService')

jest.mock('@/app/api/services/SchedulePostService', () => ({
  getSchedules: jest.fn(),
  updateSchedule: jest.fn(),
  publishNextPost: jest.fn(),
  getNextTriggerTimes: jest.fn(),
}))

describe('CronService.ensureCronIsRunning', () => {
  const { cron } = require('@/app/api-helpers/cron')
  beforeEach(() => {
    jest.clearAllMocks()
    cron.hasTask = jest.fn().mockReturnValue(false)
    cron.addTask = jest.fn()
    cron.removeTask = jest.fn()
  })

  it('should add a cron job if not already running', async () => {
    const { ensureCronIsRunning } = require('../CronService')
    await ensureCronIsRunning()
    expect(cron.hasTask).toHaveBeenCalled()
    expect(cron.addTask).toHaveBeenCalled()
  })

  it('should not add a cron job if already running', async () => {
    cron.hasTask = jest.fn().mockReturnValue(true)
    const { ensureCronIsRunning } = require('../CronService')
    await ensureCronIsRunning()
    expect(cron.hasTask).toHaveBeenCalled()
    expect(cron.addTask).not.toHaveBeenCalled()
  })
})

describe('CronService.postIfNeeded', () => {
  const {
    publishNextPost,
    getSchedules,
    getNextTriggerTimes,
  } = require('../SchedulePostService')

  it('should not post if there are no schedules', async () => {
    getSchedules.mockResolvedValue([])
    await postIfNeeded()
    expect(publishNextPost).not.toHaveBeenCalled()
  })

  it('should post if a schedule is due', async () => {
    const now = Date.now()
    getSchedules.mockResolvedValue([
      {
        id: 'schedule-1',
        name: 'Test Schedule',
        accounts: [
          {
            id: 'account-1',
            name: 'Test Account',
            platform: 'bluesky',
          } as Account,
        ],
        group: 'default',
        isActive: true,
        frequency: {
          type: 'interval',
          interval: { every: 5, unit: 'minutes' },
        } as ScheduleFrequency,
        platforms: ['bluesky'],
      } as Schedule,
    ])
    getNextTriggerTimes.mockReturnValue([new Date(now - 1 * 60 * 1000)]) // Next run was 1 minute ago

    await postIfNeeded()
    expect(publishNextPost).toHaveBeenCalledWith('schedule-1')
  })

  it('should not post if no schedules are due', async () => {
    const now = Date.now()
    getSchedules.mockResolvedValue([
      {
        id: 'schedule-1',
        name: 'Test Schedule',
        accounts: [
          {
            id: 'account-1',
            name: 'Test Account',
            platform: 'bluesky',
          } as Account,
        ],
        isActive: true,
        group: 'default',
        frequency: {
          type: 'interval',
          interval: { every: 5, unit: 'minutes' },
        } as ScheduleFrequency,
        platforms: ['bluesky'],
      } as Schedule,
    ])
    ;(
      require('../SchedulePostService').getNextTriggerTimes as jest.Mock
    ).mockResolvedValue([[new Date(now + 5 * 60 * 1000)]]) // Next run is in 5 minutes

    await postIfNeeded()
    expect(publishNextPost).not.toHaveBeenCalled()
  })

  it('should not post if schedule is inactive', async () => {
    const now = Date.now()
    getSchedules.mockResolvedValue([
      {
        id: 'schedule-1',
        name: 'Test Schedule',
        accounts: [
          {
            id: 'account-1',
            name: 'Test Account',
            platform: 'bluesky',
          } as Account,
        ],
        group: 'default',
        isActive: false,
        frequency: {
          type: 'interval',
          interval: { every: 5, unit: 'minutes' },
        } as ScheduleFrequency,
        platforms: ['bluesky'],
      } as Schedule,
    ])
    getNextTriggerTimes.mockReturnValue([new Date(now - 1 * 60 * 1000)]) // Next run was 1 minute ago

    await postIfNeeded()
    expect(publishNextPost).not.toHaveBeenCalled()
  })

  it('should not post if schedule start time is in the future', async () => {
    const now = Date.now()
    getSchedules.mockResolvedValue([
      {
        id: 'schedule-1',
        name: 'Test Schedule',
        accounts: [
          {
            id: 'account-1',
            name: 'Test Account',
            platform: 'bluesky',
          } as Account,
        ],
        group: 'default',
        isActive: true,
        startTime: new Date(now + 10 * 60 * 1000).toISOString(), // starts in 10 minutes
        frequency: {
          type: 'interval',
          interval: { every: 5, unit: 'minutes' },
        } as ScheduleFrequency,
        platforms: ['bluesky'],
      } as Schedule,
    ])
    getNextTriggerTimes.mockReturnValue([new Date(now - 1 * 60 * 1000)]) // Next run was 1 minute ago

    await postIfNeeded()
    expect(publishNextPost).not.toHaveBeenCalled()
  })

  it('should not post if schedule end time has passed', async () => {
    const now = Date.now()
    getSchedules.mockResolvedValue([
      {
        id: 'schedule-1',
        name: 'Test Schedule',
        accounts: [
          {
            id: 'account-1',
            name: 'Test Account',
            platform: 'bluesky',
          } as Account,
        ],
        group: 'default',
        isActive: true,
        endTime: new Date(now - 10 * 60 * 1000).toISOString(), // ended 10 minutes ago
        frequency: {
          type: 'interval',
          interval: { every: 5, unit: 'minutes' },
        } as ScheduleFrequency,
        platforms: ['bluesky'],
      } as Schedule,
    ])
    getNextTriggerTimes.mockReturnValue([new Date(now - 1 * 60 * 1000)]) // Next run was 1 minute ago

    await postIfNeeded()
    expect(publishNextPost).not.toHaveBeenCalled()
  })
})

describe('CronService.pruneIfNeeded', () => {
  const mockPrunePosts = jest.fn()
  beforeEach(() => {
    jest.clearAllMocks()
    ;(BackupService.prunePosts as jest.Mock).mockImplementation(mockPrunePosts)
  })

  it('should not prune if autoPruneFrequencyMinutes is not set', async () => {
    ;(appDataHelper.getAppData as jest.Mock).mockResolvedValue({
      settings: { autoPruneFrequencyMinutes: undefined },
      lastPrune: undefined,
    })
    await pruneIfNeeded()
    expect(mockPrunePosts).not.toHaveBeenCalled()
  })

  it('should not prune if autoPruneFrequencyMinutes is <= 0', async () => {
    ;(appDataHelper.getAppData as jest.Mock).mockResolvedValue({
      settings: { autoPruneFrequencyMinutes: 0 },
      lastPrune: undefined,
    })
    await pruneIfNeeded()
    expect(mockPrunePosts).not.toHaveBeenCalled()
  })

  it('should prune if there is no previous prune', async () => {
    ;(appDataHelper.getAppData as jest.Mock).mockResolvedValue({
      settings: { autoPruneFrequencyMinutes: 10 },
      lastPrune: undefined,
    })
    await pruneIfNeeded()
    expect(mockPrunePosts).toHaveBeenCalled()
  })

  it('should prune if nextPrune is due', async () => {
    const now = Date.now()
    ;(appDataHelper.getAppData as jest.Mock).mockResolvedValue({
      settings: { autoPruneFrequencyMinutes: 10 },
      lastPrune: new Date(now - 11 * 60 * 1000).toISOString(),
    })
    await pruneIfNeeded()
    expect(mockPrunePosts).toHaveBeenCalled()
  })

  it('should not prune if nextPrune is not due', async () => {
    const now = Date.now()
    ;(appDataHelper.getAppData as jest.Mock).mockResolvedValue({
      settings: { autoPruneFrequencyMinutes: 10 },
      lastPrune: new Date(now - 5 * 60 * 1000).toISOString(),
    })
    await pruneIfNeeded()
    expect(mockPrunePosts).not.toHaveBeenCalled()
  })
})

describe('CronService.backupIfNeeded', () => {
  const mockRunBackup = jest.fn()
  beforeEach(() => {
    jest.clearAllMocks()
    ;(BackupService.runBackup as jest.Mock).mockImplementation(mockRunBackup)
  })

  it('should not run backup if autoBackupFrequencyMinutes is not set', async () => {
    ;(appDataHelper.getAppData as jest.Mock).mockResolvedValue({
      settings: { autoBackupFrequencyMinutes: undefined },
      lastBackup: undefined,
    })
    await backupIfNeeded()
    expect(mockRunBackup).not.toHaveBeenCalled()
  })

  it('should not run backup if autoBackupFrequencyMinutes is <= 0', async () => {
    ;(appDataHelper.getAppData as jest.Mock).mockResolvedValue({
      settings: { autoBackupFrequencyMinutes: 0 },
      lastBackup: undefined,
    })
    await backupIfNeeded()
    expect(mockRunBackup).not.toHaveBeenCalled()
  })

  it('should run backup if there is no previous backup', async () => {
    ;(appDataHelper.getAppData as jest.Mock).mockResolvedValue({
      settings: { autoBackupFrequencyMinutes: 10 },
      lastBackup: undefined,
    })
    await backupIfNeeded()
    expect(mockRunBackup).toHaveBeenCalled()
  })

  it('should run backup if nextBackup is due', async () => {
    const now = Date.now()
    ;(appDataHelper.getAppData as jest.Mock).mockResolvedValue({
      settings: { autoBackupFrequencyMinutes: 10 },
      lastBackup: new Date(now - 11 * 60 * 1000).toISOString(),
    })
    await backupIfNeeded()
    expect(mockRunBackup).toHaveBeenCalled()
  })

  it('should not run backup if nextBackup is not due', async () => {
    const now = Date.now()
    ;(appDataHelper.getAppData as jest.Mock).mockResolvedValue({
      settings: { autoBackupFrequencyMinutes: 10 },
      lastBackup: new Date(now - 5 * 60 * 1000).toISOString(),
    })
    await backupIfNeeded()
    expect(mockRunBackup).not.toHaveBeenCalled()
  })
})
