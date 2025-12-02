/** biome-ignore-all lint/suspicious/noExplicitAny: Eventually I'll update it */

import { getVideoFilePath } from '@/helpers/utils'
import type { PostData } from '@/types/bsky'
import type { PostDisplayData } from '@/types/types'

export function transformPostDataToDisplayData(
  postData: PostData,
): PostDisplayData {
  const videoObj = {
    url: '',
    width: 0,
    height: 0,
    size: 0,
  }

  const imageList: PostDisplayData['images'] = []

  const record = postData.post.record as {
    embed?: {
      $type: string
      aspectRatio: {
        height: number
        width: number
      }
      video: {
        $type: string
        ref: {
          $link: string
        }
        mimeType: string
        size: number
      }
    }
  }

  if (
    postData.post.embed?.$type === 'app.bsky.embed.images#view' &&
    postData.post.embed.images
  ) {
    postData.post.embed.images.forEach(
      (img: {
        local?: string
        fullsize?: string
        aspectRatio: { width: number; height: number }
      }) => {
        imageList.push({
          url: img.local || img.fullsize || '',
          width: img.aspectRatio.width,
          height: img.aspectRatio.height,
          size: 0, // Size not provided in embed data
        })
      },
    )
  }

  if (record?.embed && record.embed.$type === 'app.bsky.embed.video') {
    videoObj.url =
      getVideoFilePath(
        postData.post.cid || '',
        new Date(postData.post.indexedAt).getFullYear().toString(),
      ) || ''
    videoObj.width = record.embed.aspectRatio?.width || videoObj.width
    videoObj.height = record.embed.aspectRatio?.height || videoObj.height
    videoObj.size = 0 // Size not provided in embed data
  }

  return {
    text: postData.post.record?.text || '',
    author: postData.post.author,
    indexedAt: postData.post.indexedAt,
    createdAt: postData.post.record?.createdAt || '',
    likeCount: postData.post.likeCount,
    replyCount: postData.post.replyCount,
    repostCount: postData.post.repostCount,
    images: imageList.length === 0 ? undefined : imageList,
    video: videoObj,
    isRepost: !!postData.reason,
    parent: postData.reply?.parent
      ? transformPostDataToDisplayData({ post: postData.reply.parent })
      : undefined,
    root:
      postData.reply?.root &&
      postData.reply.root.uri !== postData.reply.parent?.uri
        ? transformPostDataToDisplayData({ post: postData.reply.root })
        : undefined,
    postId: postData.post?.cid,
  } as PostDisplayData
}
