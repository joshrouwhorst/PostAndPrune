import { type NextRequest, NextResponse } from 'next/server'
import { reorderGroupPosts } from '../../services/DraftPostService'

// Reorder posts in a group
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: 'Group ID is required' },
        { status: 400 },
      )
    }

    if (!body.draftPostIds || !Array.isArray(body.draftPostIds)) {
      return NextResponse.json(
        { error: 'draftPostIds array is required' },
        { status: 400 },
      )
    }

    await reorderGroupPosts(id, body.draftPostIds)

    return NextResponse.json({
      message: 'Post priorities updated successfully',
    })
  } catch {
    return NextResponse.json(
      { error: 'Failed to update post priorities' },
      { status: 500 },
    )
  }
}
