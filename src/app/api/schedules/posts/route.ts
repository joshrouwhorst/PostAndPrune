import Logger from '@/app/api-helpers/logger'
import { type NextRequest, NextResponse } from 'next/server'
import { withBskyLogoutAndErrorHandlingForRequest } from '../../../api-helpers/apiWrapper'
import { publishDraftPost } from '../../services/DraftPostService'

const logger = new Logger('SchPostRoute')

// POST handler - wrapped with automatic Bluesky logout
export const POST = withBskyLogoutAndErrorHandlingForRequest(
  async (request: NextRequest) => {
    const { id } = await request.json()

    const url = new URL(request.url)
    const accountIds = url.searchParams.getAll('accountIds')

    if (!id) {
      logger.error('Post ID is required')
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 }
      )
    }

    if (!accountIds || accountIds.length === 0) {
      logger.error('Account IDs are required for publishing')
      return NextResponse.json(
        { error: 'Account IDs are required for publishing' },
        { status: 400 }
      )
    }

    try {
      await publishDraftPost({ id, accountIds })
      return NextResponse.json(
        { message: 'Post sent to all supported platforms' },
        { status: 200 }
      )
    } catch (error) {
      logger.error('Failed to publish post', error)
      return NextResponse.json(
        { error: 'Failed to publish post' },
        { status: 500 }
      )
    }
  }
)
