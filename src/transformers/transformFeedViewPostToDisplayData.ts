import type { PostDisplayData } from '@/types/types'
import type { FeedViewPost } from '@atproto/api/dist/client/types/app/bsky/feed/defs'
import { transformFeedViewPostToPostData } from './transformFeedViewPostToPostData'
import { transformPostDataToDisplayData } from './transformPostDataToDisplayData'

export function transformFeedViewPostToDisplayData(
  feedPost: FeedViewPost,
  accountId: string,
): PostDisplayData {
  const postData = transformFeedViewPostToPostData(feedPost, accountId)
  return transformPostDataToDisplayData(postData)
}
