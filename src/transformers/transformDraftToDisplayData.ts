/** biome-ignore-all lint/suspicious/noExplicitAny: Eventually I'll update it */
import type { DraftPost } from '@/types/drafts'
import type { PostDisplayData } from '@/types/types'

export function transformDraftToDisplayData(
  draftPost: DraftPost,
  displayName?: string | null,
  handle?: string | null,
): PostDisplayData {
  return {
    text: draftPost.meta.text || '',
    author: {
      displayName,
      handle,
    },
    indexedAt: draftPost.meta.createdAt,
    isRepost: false,
    images: draftPost.meta.images.map((img) => ({
      url: img.url || '',
      width: img.width,
      height: img.height,
      size: img.size,
    })),
    video: draftPost.meta.video
      ? {
          url: draftPost.meta.video.url || '',
          width: draftPost.meta.video.width,
          height: draftPost.meta.video.height,
          size: draftPost.meta.video.size,
        }
      : undefined,
    draftId: draftPost.meta.directoryName,
    postId: draftPost.meta.directoryName,
    group: draftPost.group,
    slug: draftPost.meta.slug,
  } as PostDisplayData
}
