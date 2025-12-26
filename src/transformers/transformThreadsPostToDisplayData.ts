import type { ThreadsPost } from '@/types/threads'
import type { PostDisplayData } from '@/types/types'

/**
 * Transform a Threads API post to the internal PostDisplayData format
 */
export function transformThreadsPostToDisplayData(
  post: ThreadsPost,
): PostDisplayData {
  return {
    text: post.text || '',
    createdAt: post.timestamp,
    indexedAt: post.timestamp,
    author: {
      handle: post.username,
      displayName: post.username, // We only have username from basic post data
    },
    likeCount: 0, // Not available in basic API response
    replyCount: 0, // Not available in basic API response
    repostCount: 0, // Not available in basic API response
    isRepost: false, // Basic posts are not reposts
    postId: post.id,
  }
}
