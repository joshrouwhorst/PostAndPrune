/** biome-ignore-all lint/suspicious/noExplicitAny: Eventually I'll update it */

import type {
  Embed,
  EmbedView,
  PostData,
  PostRecord,
  PostView,
  ReplyData,
} from '@/types/bsky'
import type { FeedViewPost } from '@atproto/api/dist/client/types/app/bsky/feed/defs'
import {
  getMediaApiUrl,
  getMediaName,
  getMediaType,
} from '../app/api-helpers/backup/BlueskyBackup'

export function transformFeedViewPostToPostData(
  feedPost: FeedViewPost,
  accountId: string,
): PostData {
  const post = feedPost.post

  return {
    post: transformPostView(post, accountId),
    reply: feedPost.reply
      ? ({
          root:
            feedPost.reply.root.$type === 'app.bsky.feed.defs#notFoundPost' ||
            feedPost.reply.root.$type === 'app.bsky.feed.defs#blockedPost'
              ? null
              : transformPostView(
                  feedPost.reply.root as FeedViewPost['post'],
                  accountId,
                ),
          parent:
            feedPost.reply.parent.$type === 'app.bsky.feed.defs#notFoundPost' ||
            feedPost.reply.parent.$type === 'app.bsky.feed.defs#blockedPost'
              ? null
              : transformPostView(
                  feedPost.reply.parent as FeedViewPost['post'],
                  accountId,
                ),
        } as ReplyData)
      : undefined,
    reason:
      feedPost.reason?.$type === 'app.bsky.feed.defs#reasonRepost'
        ? (() => {
            const repostReason = feedPost.reason as {
              $type: 'app.bsky.feed.defs#reasonRepost'
              by: {
                did: string
                handle: string
                displayName?: string
                avatar?: string
              }
              uri: string
              cid: string
              indexedAt: string
            }
            return {
              $type: repostReason.$type,
              by: {
                did: repostReason.by.did,
                handle: repostReason.by.handle,
                displayName:
                  repostReason.by.displayName || repostReason.by.handle,
                avatar: repostReason.by.avatar,
                labels: [],
                createdAt: '',
              },
              uri: repostReason.uri,
              cid: repostReason.cid,
              indexedAt: repostReason.indexedAt,
            }
          })()
        : undefined,
  }
}

function transformPostView(
  post: FeedViewPost['post'],
  accountId: string,
): PostView {
  if (!post) {
    throw new Error('Post is undefined')
  }

  return {
    uri: post.uri,
    cid: post.cid,
    record: {
      $type: post.record.$type,
      createdAt: post.record.createdAt,
      text: (post.record as any).text || '',
      langs: (post.record as any).langs || [],
      facets: (post.record as any).facets || [],
      entities: (post.record as any).entities || [],
      reply: (post.record as any).reply,
      embed: (post.record as any).embed,
    } as PostRecord,
    author: {
      did: post.author.did,
      handle: post.author.handle,
      displayName: post.author.displayName || post.author.handle,
      avatar: post.author.avatar,
      labels: [],
      createdAt: post.author.createdAt || '',
    },
    indexedAt: post.indexedAt,
    likeCount: post.likeCount || 0,
    replyCount: post.replyCount || 0,
    repostCount: post.repostCount || 0,
    embed:
      post.embed && post.embed.$type === 'app.bsky.embed.images#view'
        ? ({
            $type: post.embed.$type,
            images:
              (post.embed as EmbedView).images?.map((image, index) => ({
                fullsize: image.fullsize,
                local: getMediaApiUrl(
                  accountId,
                  getMediaName(post, getMediaType(image.fullsize), index),
                  post.indexedAt.split('T')[0].split('-')[0],
                  getMediaType(image.fullsize),
                ),
                thumb: image.thumb,
                alt: image.alt,
                aspectRatio: image.aspectRatio || { width: 1, height: 1 },
              })) || [],
          } as Embed)
        : post.embed && post.embed.$type === 'app.bsky.embed.external#view'
          ? {
              $type: post.embed.$type,
              external: {
                uri: (post.embed as any).external?.uri,
                title: (post.embed as any).external?.title,
                description: (post.embed as any).external?.description,
              },
              images:
                (post.embed as EmbedView).images?.map((image, index) => ({
                  fullsize: image.fullsize,
                  local: getMediaApiUrl(
                    accountId,
                    getMediaName(post, getMediaType(image.fullsize), index),
                    post.indexedAt.split('T')[0].split('-')[0],
                    getMediaType(image.fullsize),
                  ),
                  thumb: image.thumb,
                  alt: image.alt,
                  aspectRatio: image.aspectRatio || { width: 1, height: 1 },
                })) || [],
              record: (post.embed as any).record || undefined,
            }
          : post.embed && post.embed.$type === 'app.bsky.embed.record#view'
            ? {
                $type: post.embed.$type,
                record: (post.embed as any).record || undefined,
              }
            : undefined,
    bookmarkCount: post?.bookmarkCount || 0,
    quoteCount: post?.quoteCount || 0,
    viewer: {
      like: post.viewer?.like || undefined,
      bookmarked: post.viewer?.bookmarked || false,
      threadMuted: post.viewer?.threadMuted || false,
      embeddingDisabled: post.viewer?.embeddingDisabled || false,
    },
    labels: post.labels || [],
    $type: post.$type,
  }
}
