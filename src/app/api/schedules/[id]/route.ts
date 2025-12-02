import Logger from '@/app/api-helpers/logger'
import { NextResponse } from 'next/server'
import {
  getScheduleLookups,
  publishNextPost,
  reorderSchedulePosts,
} from '../../services/SchedulePostService'

const logger = new Logger('SchPostRoute')

import { withSocialLogoutWithId } from '@/app/api-helpers/apiWrapper'

// Get schedule lookups
export const GET = withSocialLogoutWithId(async (id) => {
  try {
    if (!id) {
      logger.error('Schedule ID is required')
      return NextResponse.json(
        { error: 'Schedule ID is required' },
        { status: 400 },
      )
    }

    const lookups = await getScheduleLookups(id)
    if (!lookups) {
      logger.error('No scheduled lookups found')
      return NextResponse.json(
        { error: 'No scheduled lookups found' },
        { status: 404 },
      )
    }
    return NextResponse.json(lookups)
  } catch (error) {
    logger.error('Failed to fetch scheduled lookups', error)
    return NextResponse.json(
      { error: 'Failed to fetch scheduled lookups' },
      { status: 500 },
    )
  }
})

// Reorder next posts for schedule
export const PUT = withSocialLogoutWithId(async (id, request) => {
  try {
    const { newOrder } = await request.json()
    if (!id) {
      logger.error('Schedule ID is required for updating next posts')
      return NextResponse.json(
        { error: 'Schedule ID is required' },
        { status: 400 },
      )
    }
    if (!Array.isArray(newOrder)) {
      logger.error('newOrder must be an array')
      return NextResponse.json(
        { error: 'newOrder must be an array' },
        { status: 400 },
      )
    }

    await reorderSchedulePosts(id, newOrder)

    return NextResponse.json({
      message: 'Schedule order updated successfully',
    })
  } catch (error) {
    logger.error('Failed to update schedule order', error)
    return NextResponse.json(
      { error: 'Failed to update schedule order' },
      { status: 500 },
    )
  }
})

// Publish the next post for the schedule
export const POST = withSocialLogoutWithId(async (id) => {
  try {
    if (!id) {
      logger.error('Schedule ID is required')
      return NextResponse.json(
        { error: 'Schedule ID is required' },
        { status: 400 },
      )
    }

    await publishNextPost(id)

    return NextResponse.json({
      message: 'Schedule triggered successfully',
    })
  } catch (error) {
    logger.error('Failed to trigger schedule', error)
    return NextResponse.json(
      { error: 'Failed to trigger schedule' },
      { status: 500 },
    )
  }
})
