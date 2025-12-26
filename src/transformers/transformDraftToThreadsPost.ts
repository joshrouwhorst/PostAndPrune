import type { DraftPost } from '@/types/drafts'
import type { CreateThreadsPostData } from '@/types/threads'

/**
 * Transform a DraftPost to Threads API post creation format
 */
export function transformDraftToThreadsPost(
  post: DraftPost,
): CreateThreadsPostData {
  const threadsPost: CreateThreadsPostData = {
    media_type: 'TEXT',
    text: post.meta.text,
  }

  // Handle images
  if (post.meta.images && post.meta.images.length > 0) {
    if (post.meta.images.length === 1) {
      threadsPost.media_type = 'IMAGE'
      threadsPost.image_url = post.meta.images[0].url
    } else {
      // Multiple images = carousel
      threadsPost.media_type = 'CAROUSEL_ALBUM'
      // For carousel posts, we need to create media containers first
      // This will be handled in the ThreadsAuth.addPost() method
    }
  }

  // Handle video
  if (post.meta.video) {
    threadsPost.media_type = 'VIDEO'
    threadsPost.video_url = post.meta.video.url
  }

  // Handle reply settings from draft meta
  if (post.meta.platformSettings?.threads?.replyControl) {
    threadsPost.reply_control = post.meta.platformSettings.threads.replyControl
  }

  // Handle location if specified
  if (post.meta.platformSettings?.threads?.locationId) {
    threadsPost.location_id = post.meta.platformSettings.threads.locationId
  }

  // Handle country allowlist if specified
  if (post.meta.platformSettings?.threads?.allowlistedCountries) {
    threadsPost.allowlisted_country_codes =
      post.meta.platformSettings.threads.allowlistedCountries
  }

  return threadsPost
}
