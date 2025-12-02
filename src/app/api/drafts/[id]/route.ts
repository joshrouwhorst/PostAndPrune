import { withSocialLogoutWithId } from '@/app/api-helpers/apiWrapper'
import Logger from '@/app/api-helpers/logger'
import {
  deleteDraftPost,
  duplicateDraftPost,
  getDraftPost,
  publishDraftPost,
  updateDraftPost,
} from '@/app/api/services/DraftPostService'
import type { DraftPost } from '@/types/drafts'
import { NextResponse } from 'next/server'

const logger = new Logger('DraftRoute')

// Get a draft post by ID
export const GET = withSocialLogoutWithId(async (id) => {
  try {
    const post = await getDraftPost(id)
    if (!post) {
      logger.error('Post not found for ID:', id)
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }
    return NextResponse.json(post)
  } catch (error) {
    logger.error('Failed to fetch post for GET request', error)
    return NextResponse.json(
      {
        error: id ? 'Failed to fetch post' : 'Failed to fetch app data',
      },
      { status: 500 },
    )
  }
})

// Publishing or Duplicating a draft post
export const POST = withSocialLogoutWithId(async (id, request) => {
  try {
    const url = new URL(request.url)
    const duplicate = url.searchParams.get('duplicate')
    const publish = url.searchParams.get('publish')
    const accountIds = url.searchParams.getAll('accountIds')

    if (!id) {
      logger.error('Post ID not provided for POST request')
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 },
      )
    }

    if (publish === 'true' && accountIds.length === 0) {
      logger.error('Account IDs are required for publishing')
      return NextResponse.json(
        { error: 'Account IDs are required for publishing' },
        { status: 400 },
      )
    }

    if (duplicate === 'true') {
      // Duplicate the post if requested
      const duplicatedPost = await duplicateDraftPost(id)
      return NextResponse.json(duplicatedPost, { status: 201 })
    } else if (publish === 'true') {
      // Publish the post if requested
      await publishDraftPost({ id, accountIds })
      return NextResponse.json({ message: 'Post published' }, { status: 201 })
    } else {
      logger.error('Invalid action for POST request')
      return NextResponse.json(
        { error: 'Invalid action. To duplicate, set duplicate=true in query.' },
        { status: 400 },
      )
    }
  } catch (error) {
    logger.error('Failed to process POST request', error)
    return NextResponse.json(
      { error: 'Failed to create post' },
      { status: 500 },
    )
  }
})

// Update a draft post by ID
export const PUT = withSocialLogoutWithId(async (id, request) => {
  try {
    if (!id) {
      logger.error('Post ID is required for PUT request')
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 },
      )
    }
    const input: DraftPost = await request.json()
    const newPost = await updateDraftPost(id, input)
    return NextResponse.json(newPost, { status: 201 })
  } catch (error) {
    logger.error('Failed to update post', error)
    return NextResponse.json(
      { error: 'Failed to update post' },
      { status: 500 },
    )
  }
})

// Delete a draft post by ID
export const DELETE = withSocialLogoutWithId(async (id) => {
  try {
    if (!id) {
      logger.error('Post ID is required for DELETE request')
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 },
      )
    }
    await deleteDraftPost(id)
    return NextResponse.json({ message: 'Post deleted' })
  } catch (error) {
    logger.error('Failed to delete post', error)
    return NextResponse.json(
      { error: 'Failed to delete post' },
      { status: 500 },
    )
  }
})
