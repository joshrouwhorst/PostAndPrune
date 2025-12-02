import { getAppData, saveAppData } from '@/app/api-helpers/appData'
import { DEFAULT_GROUP } from '@/config/main'
import { wait } from '@/helpers/utils'
import type { DraftPost } from '@/types/drafts'
import type {
  CreateScheduleRequest,
  Schedule,
  ScheduleFrequency,
  ScheduleLookups,
} from '@/types/scheduler'
import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import { getNextDatetime } from '../../api-helpers/getNextDatetime'
import Logger from '../../api-helpers/logger'
import {
  getDraftPostsInGroup,
  getDraftPostsInSchedule,
  publishDraftPost,
} from './DraftPostService'

dayjs.extend(utc)
dayjs.extend(timezone)

const logger = new Logger('SdPostServ')

interface ScheduleData {
  schedules: Schedule[]
}

export async function getSchedules(): Promise<Schedule[]> {
  const appData = await getAppData()
  return appData.schedules || []
}

async function updateScheduleData(data: Partial<ScheduleData>): Promise<void> {
  logger.log(`Updating schedules.`, data)
  const appData = await getAppData()
  const updatedData = {
    ...appData,
    ...data,
  }
  await saveAppData(updatedData)
}

function cleanFrequency(frequency: ScheduleFrequency): ScheduleFrequency {
  const cleanedFrequency = { ...frequency }

  switch (cleanedFrequency.interval.unit) {
    case 'minutes':
    case 'hours':
      cleanedFrequency.timesOfDay = []
      cleanedFrequency.daysOfWeek = []
      cleanedFrequency.daysOfMonth = []
      break
    case 'days':
      cleanedFrequency.daysOfWeek = []
      cleanedFrequency.daysOfMonth = []
      break
    case 'weeks':
      cleanedFrequency.daysOfMonth = []
      break
    case 'months':
      cleanedFrequency.daysOfWeek = []
      break
  }

  return cleanedFrequency
}

export async function createSchedule(
  request: CreateScheduleRequest,
): Promise<Schedule> {
  const schedules = await getSchedules()

  // let accounts =
  //   request.accountIds && request.accountIds.length > 0
  //     ? await getAccounts()
  //     : []

  const _appData = await getAppData()
  let accounts = _appData.settings?.accounts || []

  accounts = accounts.filter((acc) => request.accountIds.includes(acc.id))

  if (
    request.accountIds &&
    request.accountIds.length > 0 &&
    accounts.length === 0
  ) {
    throw new Error('No valid accounts found for the provided account IDs')
  }

  logger.log(`Creating schedule with name: ${request.name}`, {
    frequency: request.frequency,
    accounts: accounts.map((acc) => acc.id),
  })

  const schedule: Schedule = {
    id: `schedule-${Date.now()}`,
    name: request.name,
    frequency: cleanFrequency(request.frequency),
    isActive: request.isActive ?? true,
    createdAt: new Date().toISOString(),
    accounts,
    group: request.group || DEFAULT_GROUP,
  }

  const updatedSchedules = [...schedules, schedule]
  await updateScheduleData({ schedules: updatedSchedules })

  return schedule
}

export async function updateSchedule(
  scheduleId: string,
  updates: Partial<Schedule>,
): Promise<Schedule> {
  logger.log(`Updating schedule ${scheduleId}`, updates)
  const schedules = await getSchedules()
  const scheduleIndex = schedules.findIndex((s) => s.id === scheduleId)

  if (scheduleIndex === -1) {
    throw new Error(`Schedule ${scheduleId} not found`)
  }

  const updatedSchedule = { ...schedules[scheduleIndex], ...updates }

  if (updates.frequency) {
    updatedSchedule.frequency = cleanFrequency(updates.frequency)
  }

  schedules[scheduleIndex] = updatedSchedule
  await updateScheduleData({ schedules })

  return updatedSchedule
}

export async function deleteSchedule(scheduleId: string): Promise<void> {
  logger.log(`Deleting schedule ${scheduleId}.`)
  const schedules = await getSchedules()

  const updatedSchedules = schedules.filter((s) => s.id !== scheduleId)

  await updateScheduleData({
    schedules: updatedSchedules,
  })
}

export async function reorderSchedulePosts(
  scheduleId: string,
  newOrder: string[],
): Promise<void> {
  logger.log(`Reordering posts for schedule ${scheduleId}.`, { newOrder })
  const schedules = await getSchedules()
  const schedule = schedules.find((s) => s.id === scheduleId)
  if (!schedule) {
    throw new Error(`Schedule ${scheduleId} not found`)
  }

  const group = schedule.group || 'default'
  const postsToReorder = await getDraftPostsInGroup(group)

  if (postsToReorder.length !== newOrder.length) {
    throw new Error('New order length does not match number of scheduled posts')
  }

  const idSet = new Set(postsToReorder.map((p) => p.meta.directoryName))
  for (const id of newOrder) {
    if (!idSet.has(id)) {
      throw new Error(`Post ID ${id} is not part of the scheduled posts`)
    }
  }

  schedule.postOrder = newOrder
  await updateScheduleData({ schedules })
}

export async function getSchedulePosts(
  scheduleId: string,
): Promise<DraftPost[]> {
  const schedule = (await getSchedules()).find((s) => s.id === scheduleId)
  if (!schedule) {
    throw new Error(`Schedule ${scheduleId} not found`)
  }

  return await getDraftPostsInSchedule(schedule)
}

export async function getScheduleLookups(
  scheduleId: string,
  startDate?: Date,
): Promise<ScheduleLookups> {
  const schedules = await getSchedules()
  const schedule = schedules.find((s) => s.id === scheduleId)

  // Use the schedule's start time if no startDate provided
  if (!startDate && schedule?.startTime) {
    startDate = new Date(schedule.startTime)
  } else {
    // Or use "now" if no startTime is set
    startDate = startDate || new Date()
  }

  const nextPosts = await getSchedulePosts(scheduleId)
  let nextPostDates: Date[] = []
  if (schedule?.isActive && nextPosts.length > 0) {
    nextPostDates = getNextTriggerTimes(
      startDate,
      schedule.frequency,
      nextPosts.length,
    )
  }
  return { nextPosts, nextPostDates }
}

export async function getNextPost(
  scheduleId: string,
): Promise<DraftPost | null> {
  const lookups = await getScheduleLookups(scheduleId)
  return lookups.nextPosts.length > 0 ? lookups.nextPosts[0] : null
}

export async function publishNextPost(scheduleId: string): Promise<void> {
  logger.opening('Publish Next Post Process')

  const schedules = await getSchedules()
  const schedule = schedules.find((s) => s.id === scheduleId)

  if (!schedule || !schedule.isActive) {
    logger.log(`Schedule ${scheduleId} is not active or not found.`)
    logger.closing('Publish Next Post Process')
    return
  }

  // Update schedule last triggered
  schedule.lastTriggered = new Date().toISOString()
  const nextTriggers = getNextTriggerTimes(
    new Date(schedule.lastTriggered),
    schedule.frequency,
    1,
  )
  schedule.nextTrigger =
    nextTriggers.length > 0 ? nextTriggers[0].toISOString() : null

  const post = await getNextPost(scheduleId)

  if (!post) {
    await updateScheduleData({ schedules })
    logger.log(`No post found to publish for schedule ID: ${scheduleId}`)
    logger.closing('Publish Next Post Process')
    return
  }

  logger.log(`Schedule ${scheduleId} found: ${schedule.name}`)

  logger.log(
    `Next post for schedule ${schedule.name} is ${post.meta.directoryName}.`,
  )

  if (!schedule.accounts || schedule.accounts.length === 0) {
    logger.log(
      `No accounts specified for schedule ${schedule.name}. Skipping publish.`,
    )
    await updateScheduleData({ schedules })
    logger.closing('Publish Next Post Process')
    return
  }

  let attempts = 0
  const maxAttempts = 3
  let successful = false
  while (attempts < maxAttempts) {
    try {
      logger.log(
        `Posting ${post.meta.directoryName} for schedule ${
          schedule.name
        } (Attempt ${attempts + 1})`,
      )
      await publishDraftPost({
        id: post.meta.directoryName,
        accounts: schedule.accounts,
      })
      successful = true
      break // Success, exit loop
    } catch (error) {
      attempts++
      logger.error(
        `Failed to publish ${post.meta.directoryName} for schedule ${schedule.name} (Attempt ${attempts}):`,
        error,
      )

      if (attempts >= maxAttempts) {
        logger.error(
          `Giving up after ${maxAttempts} attempts to publish ${post.meta.directoryName} for schedule ${schedule.name}.`,
        )
      } else {
        await wait(5000) // Wait 5 seconds before retrying
      }
    }
  }

  if (!successful) {
    logger.log(`Successfully posted draft ${post.meta.directoryName}`)
  } else {
    logger.log(
      `Failed to post draft ${post.meta.directoryName} after ${maxAttempts} attempts.`,
    )
  }

  await updateScheduleData({ schedules })

  logger.closing('Publish Next Post Process')
  return
}

export function getNextTriggerTimes(
  startDate = new Date(),
  frequency: ScheduleFrequency,
  count: number = 1,
): Date[] {
  const now = startDate
  const { interval, timesOfDay, timeZone, daysOfWeek, daysOfMonth } = frequency
  const { every, unit } = interval

  const run = getNextDatetime(
    now,
    every,
    unit,
    timesOfDay,
    timeZone,
    daysOfWeek,
    daysOfMonth,
    count,
  )

  return run.length > 0 ? run : [now]
}
