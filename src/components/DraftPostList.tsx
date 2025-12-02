'use client'

import PostList from '@/components/PostList'
import { useDraftContext } from '@/providers/DraftsProvider'
import { transformDraftToDisplayData } from '@/transformers/transformDraftToDisplayData'

export default function DraftPostList() {
  const { drafts, isLoading } = useDraftContext()
  const posts = drafts.map((d) => transformDraftToDisplayData(d))
  return (
    <div className="relative">
      <PostList posts={posts} isLoading={isLoading}>
        <div className="flex flex-col items-center justify-center py-16 text-center text-gray-500">
          <h2 className="text-lg font-semibold mb-2">No drafts yet</h2>
          <p className="mb-4">
            Create a draft by clicking the button in the top right.
          </p>
        </div>
      </PostList>
    </div>
  )
}
