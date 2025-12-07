import {
  withSocialLogoutForRequest,
  withSocialLogoutWithId,
} from '@/app/api-helpers/apiWrapper'
import Logger from '@/app/api-helpers/logger'
import {
  createDraftPost,
  getDraftPosts,
  getDraftPostsInGroup,
  getDraftPostsInSchedule,
} from '@/app/api/services/DraftPostService'
import { getSchedules } from '@/app/api/services/SchedulePostService'
import type { CreateDraftInput, DraftPost } from '@/types/drafts'
import type { Schedule } from '@/types/scheduler'
import { NextResponse } from 'next/server'

const logger = new Logger('DraftsRoute')

export const GET = withSocialLogoutForRequest(async (request) => {
  const { searchParams } = new URL(request.url)
  const group = searchParams.get('group') || undefined
  const scheduleId = searchParams.get('schedule') || undefined
  const searchTerm = searchParams.get('searchTerm') || undefined

  try {
    let posts: DraftPost[] = []
    if (group) {
      posts = await getDraftPostsInGroup(group)
    } else if (scheduleId) {
      const schedule = (await getSchedules()).find(
        (s) => s.id === scheduleId,
      ) as Schedule

      if (!schedule) {
        return NextResponse.json(
          { error: 'Schedule not found' },
          { status: 404 },
        )
      }

      posts = await getDraftPostsInSchedule(schedule)
    } else {
      posts = await getDraftPosts()
    }

    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase()
      posts = posts.filter((post) => {
        return (
          post.meta.slug.toLowerCase().includes(lowerSearchTerm) ||
          post.group.toLowerCase().includes(lowerSearchTerm) ||
          post.meta.text?.toLowerCase().includes(lowerSearchTerm)
        )
      })
    }

    return NextResponse.json(posts)
  } catch (error) {
    logger.error('Failed to fetch posts', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch posts',
      },
      { status: 500 },
    )
  }
})

// Create a new draft post
export const POST = withSocialLogoutForRequest(async (request) => {
  try {
    const input = await request.json()
    if (Array.isArray(input)) {
      // Handle multiple CreateDraftInputs
      const newPosts = await Promise.all(
        input.map((item: CreateDraftInput) => createDraftPost(item)),
      )
      return NextResponse.json(newPosts, { status: 201 })
    } else {
      // Handle single CreateDraftInput
      const newPost = await createDraftPost(input as CreateDraftInput)
      return NextResponse.json(newPost, { status: 201 })
    }
  } catch (error) {
    logger.error('Failed to create post(s)', error)
    return NextResponse.json(
      { error: 'Failed to create post(s)' },
      { status: 500 },
    )
  }
})

// Update an existing draft post - redirect to individual draft route
export const PUT = withSocialLogoutWithId(async (id, request) => {
  if (!id) {
    return NextResponse.json({ error: 'Post ID is required' }, { status: 400 })
  }

  // Forward the request to the individual draft route
  const url = new URL(request.url)
  url.pathname = `/api/drafts/${id}`

  const body = await request.text()

  return fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...Object.fromEntries(request.headers.entries()),
    },
    body,
  })
})
