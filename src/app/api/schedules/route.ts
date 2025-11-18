import Logger from '@/app/api-helpers/logger'
import { NextResponse } from 'next/server'
import { withSocialLogoutAndErrorHandlingForRequest } from '../../api-helpers/apiWrapper'
import { ensureCronIsRunning } from '../services/CronService'
import {
  createSchedule,
  deleteSchedule,
  getSchedules,
  updateSchedule,
} from '../services/SchedulePostService'

const logger = new Logger('ScheduleRoute')

export const GET = withSocialLogoutAndErrorHandlingForRequest(
  async (request) => {
    try {
      await ensureCronIsRunning() // Ensure cron job is running to handle schedules
      const { searchParams } = new URL(request.url)
      const scheduleId = searchParams.get('id')

      const schedules = await getSchedules()

      if (scheduleId) {
        const schedule = schedules.find((s) => s.id === scheduleId)
        if (!schedule) {
          logger.error('Schedule not found for ID:', scheduleId)
          return NextResponse.json(
            { error: 'Schedule not found' },
            { status: 404 }
          )
        }
        return NextResponse.json(schedule)
      }
      return NextResponse.json(schedules)
    } catch (error) {
      logger.error('Failed to fetch schedules', error)
      return NextResponse.json(
        { error: 'Failed to fetch schedules' },
        { status: 500 }
      )
    }
  }
)

export const POST = withSocialLogoutAndErrorHandlingForRequest(
  async (request) => {
    try {
      const body = await request.json()
      const schedule = await createSchedule(body)
      return NextResponse.json(schedule, { status: 201 })
    } catch (error) {
      logger.error('Failed to create schedule', error)
      return NextResponse.json(
        { error: 'Failed to create schedule' },
        { status: 500 }
      )
    }
  }
)

export const PUT = withSocialLogoutAndErrorHandlingForRequest(
  async (request) => {
    try {
      const body = await request.json()
      const { id, ...updateData } = body
      const schedule = await updateSchedule(id, updateData)
      return NextResponse.json(schedule)
    } catch (error) {
      logger.error('Failed to update schedule', error)
      return NextResponse.json(
        { error: 'Failed to update schedule' },
        { status: 500 }
      )
    }
  }
)

export const DELETE = withSocialLogoutAndErrorHandlingForRequest(
  async (request) => {
    try {
      const { searchParams } = new URL(request.url)
      const scheduleId = searchParams.get('id')

      if (!scheduleId) {
        logger.error('Schedule ID is required')
        return NextResponse.json(
          { error: 'Schedule ID is required' },
          { status: 400 }
        )
      }

      await deleteSchedule(scheduleId)
      return NextResponse.json({ message: 'Schedule deleted successfully' })
    } catch (error) {
      logger.error('Failed to delete schedule', error)
      return NextResponse.json(
        { error: 'Failed to delete schedule' },
        { status: 500 }
      )
    }
  }
)
