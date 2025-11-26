/** biome-ignore-all lint/suspicious/noArrayIndexKey: see code */
'use client'

import { useDraftContext } from '@/providers/DraftsProvider'
import { useModal } from '@/providers/ModalProvider'
import { transformDraftToDisplayData } from '@/transformers/transformDraftToDisplayData'
import { transformPostDataToDisplayData } from '@/transformers/transformPostDataToDisplayData'
import type { PostData } from '@/types/bsky'
import type { DraftPost } from '@/types/drafts'
import type { PostDisplayData } from '@/types/types'
import {
  CloudUpload,
  Copy,
  CopyPlus,
  Edit,
  Folder,
  FolderPen,
  Heart,
  MessageCircle,
  Repeat2,
  Reply,
  Trash,
} from 'lucide-react'
import Image from 'next/image'
import React from 'react'
import AccountSelector from './AccountSelector'
import PostMediaCarousel from './PostMediaCarousel'
import PostVideoPlayer from './PostVideoPlayer'
import { Button, LinkButton } from './ui/forms'

interface PostProps {
  variant?: 'full' | 'compact'
  postData?: PostData
  draftPost?: DraftPost
  displayData?: PostDisplayData
}

function getEditLink(draftId: string) {
  return `/drafts/${draftId}`
}

export default function Post({
  variant,
  postData,
  draftPost,
  displayData,
}: PostProps) {
  const { deleteDraft, duplicateDraft, refresh, publishDraft } =
    useDraftContext()
  const { openModal, closeModal } = useModal()

  if (!variant) variant = 'full'

  // Handle conversions
  if (!displayData && postData) {
    displayData = transformPostDataToDisplayData(postData)
  } else if (!displayData && draftPost) {
    displayData = transformDraftToDisplayData(
      draftPost,
      null, // TODO: Figure out a default display name or get it from settings
      null
    )
  }

  const item = displayData

  if (!item) {
    return <div>No post data available</div>
  }

  // Format text with links and mentions
  const formatText = (text: string) => {
    return text.split(/(\s+)/).map((part, index) => {
      // Handle newlines
      if (part.includes('\n')) {
        return part.split('\n').map((line, lineIndex) => (
          <React.Fragment key={`${index}-${lineIndex}`}>
            {line}
            {lineIndex < part.split('\n').length - 1 && <br />}
          </React.Fragment>
        ))
      }
      // Handle URLs
      if (part.match(/^https?:\/\/\S+/)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            {part}
          </a>
        )
      }
      // Handle mentions
      if (part.match(/^@\w+/)) {
        return (
          <span key={index} className="text-blue-500">
            {part}
          </span>
        )
      }
      // Handle hashtags
      if (part.match(/^#\w+/)) {
        return (
          <span key={index} className="text-blue-500">
            {part}
          </span>
        )
      }
      return part
    })
  }

  const text = formatText(item.text)
  const itemJson = JSON.stringify(item, null, 2)

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(itemJson)
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
    }
  }

  const handlePublishDraft = async (post: PostDisplayData) => {
    if (!post.draftId) return

    let modalId: string

    const PublishModal = () => {
      const [selectedAccountIds, setSelectedAccountIds] = React.useState<
        string[]
      >([])

      return (
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            Choose which accounts you want to publish this draft to:
          </p>

          <AccountSelector
            multiple={true}
            selectedAccountIds={selectedAccountIds}
            onChange={({ accounts }) => {
              if (accounts) {
                setSelectedAccountIds(accounts.map((account) => account.id))
              } else {
                setSelectedAccountIds([])
              }
            }}
          />

          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              onClick={() => closeModal(modalId)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              onClick={async () => {
                if (selectedAccountIds.length === 0) {
                  alert('Please select at least one account to publish to.')
                  return
                }

                try {
                  if (post.draftId) {
                    await publishDraft(post.draftId, selectedAccountIds)
                    closeModal(modalId)
                    await refresh()
                  }
                } catch (error) {
                  console.error('Failed to publish draft:', error)
                  alert('Failed to publish draft. Please try again.')
                }
              }}
              disabled={selectedAccountIds.length === 0}
            >
              Publish to {selectedAccountIds.length} account
              {selectedAccountIds.length !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      )
    }

    modalId = openModal({
      title: 'Select Accounts to Publish To',
      children: <PublishModal />,
    })
  }

  const handleDeleteDraft = async (post: PostDisplayData) => {
    if (
      post.draftId &&
      confirm('Are you sure you want to delete this draft?')
    ) {
      await deleteDraft(post.draftId)
      await refresh()
    }
  }

  const handleDuplicateDraft = async (post: PostDisplayData) => {
    if (post.draftId) {
      const newPost = await duplicateDraft(post.draftId)
      if (newPost)
        window.location.href = `/drafts/${newPost.meta.directoryName}`
    }
  }

  function compactPostView({ displayData }: { displayData: PostDisplayData }) {
    return (
      <div className="flex items-start gap-3 py-2 px-3 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 transition-colors">
        {/* Author avatar placeholder */}
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-400 text-lg font-bold">
          {displayData.author?.displayName
            ? displayData.author.displayName[0]
            : displayData.author?.handle?.[0]?.toUpperCase() || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate max-w-[120px]">
              {displayData.author?.displayName || displayData.author?.handle}
            </span>
            <span className="text-gray-500 text-xs truncate max-w-[100px]">
              @{displayData.author?.handle}
            </span>
            {displayData.isRepost && (
              <span className="text-green-500 text-xs flex items-center gap-1">
                <Repeat2 className="w-3 h-3" /> Repost
              </span>
            )}
            {displayData.group && (
              <span className="text-blue-500 text-xs flex items-center gap-1">
                <Folder className="w-3 h-3" /> {displayData.group}
              </span>
            )}
            {displayData.createdAt && (
              <span className="text-gray-400 text-xs ml-auto">
                {new Date(displayData.createdAt).toLocaleDateString()}
              </span>
            )}
          </div>
          <div className="text-sm text-gray-900 dark:text-gray-100 mt-1 line-clamp-2 break-words">
            {displayData.text.length > 120
              ? displayData.text.slice(0, 120) + '…'
              : displayData.text}
            {displayData.images && displayData.images.length > 0 && (
              <div className="mt-2 relative flex flex-row gap-1">
                {displayData.images.slice(0, 4).map((img, idx) => (
                  <div key={idx} className="relative h-20 w-20">
                    <Image
                      src={img.url}
                      alt={`Post media ${idx + 1}`}
                      className="object-cover rounded-md border border-gray-200 dark:border-gray-700"
                      fill
                      sizes="80px"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                ))}
              </div>
            )}
            {/* Engagement metrics */}
            <div className="flex gap-4 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Heart className="w-3 h-3" /> {displayData.likeCount || 0}
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle className="w-3 h-3" />{' '}
                {displayData.replyCount || 0}
              </span>
              <span className="flex items-center gap-1">
                <Repeat2 className="w-3 h-3" /> {displayData.repostCount || 0}
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  function fullSizedView({ displayData }: { displayData: PostDisplayData }) {
    const videoUrl =
      displayData.video?.url && displayData.video.url !== ''
        ? displayData.video.url
        : null

    return (
      <div className="p-4 border border-gray-300 rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 shadow-md text-black dark:text-white">
        <div className="flex flex-row items-center justify-between mb-2">
          {/* TODO: Figure out what to show for display name on drafts */}
          {/* Name and handle */}
          <div className="flex flex-col md:flex-row md:items-center md:gap-2">
            {(displayData.author?.displayName ||
              displayData.author?.handle) && (
              <span className="font-semibold">
                {displayData.author?.displayName || displayData.author?.handle}
              </span>
            )}
            {displayData.author?.handle && (
              <span className="text-gray-500 text-sm">
                @{displayData.author.handle}
              </span>
            )}
            {displayData.parent && (
              <span className="text-blue-500 text-sm">
                <Reply className="w-4 h-4" /> Reply
              </span>
            )}
            {displayData.isRepost && (
              <span className="text-green-500 text-sm">
                <Repeat2 className="w-4 h-4" /> Repost
              </span>
            )}
          </div>

          {/* Buttons */}
          <div className="flex-1 flex justify-end gap-2">
            {displayData.draftId ? (
              <Button
                variant="icon"
                color="tertiary"
                onClick={() => handlePublishDraft(displayData)}
                title="Publish post"
              >
                <CloudUpload className="w-4 h-4" />
              </Button>
            ) : null}
            {displayData.draftId ? (
              <Button
                variant="icon"
                color="secondary"
                onClick={() => handleDuplicateDraft(displayData)}
                title="Duplicate post"
              >
                <CopyPlus className="w-4 h-4" />
              </Button>
            ) : null}

            {displayData.draftId ? (
              <LinkButton
                variant="icon"
                color="primary"
                href={getEditLink(displayData.draftId)}
                title="Edit post"
              >
                <Edit className="w-4 h-4" />
              </LinkButton>
            ) : null}

            {displayData.draftId ? (
              <Button
                variant="icon"
                color="danger"
                onClick={() => handleDeleteDraft(displayData)}
                title="Delete post"
              >
                <Trash className="w-4 h-4" />
              </Button>
            ) : null}

            <Button
              variant="icon"
              color="secondary"
              onClick={copyToClipboard}
              title="Copy JSON to clipboard"
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>

          {/* Timestamp */}
          <span className="text-gray-500 text-sm ml-1">
            {new Date(displayData.createdAt).toLocaleDateString()}
          </span>
        </div>
        <ReplyParents parent={displayData.parent} root={displayData.root} />
        <div className="mb-2">{text}</div>
        <PostMediaCarousel media={displayData.images || []} />
        <PostVideoPlayer videoUrl={videoUrl || undefined} />
        {/* Engagement metrics */}
        <div className="flex flex-row mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
          <div className="flex flex-1 gap-4">
            <span className="text-gray-500 text-sm flex items-center gap-1">
              <Heart className="w-4 h-4" color="red" />{' '}
              {displayData.likeCount || 0}
            </span>
            <span className="text-gray-500 text-sm flex items-center gap-1">
              <MessageCircle className="w-4 h-4" color="teal" />{' '}
              {displayData.replyCount || 0}
            </span>
            <span className="text-gray-500 text-sm flex items-center gap-1">
              <Repeat2 className="w-4 h-4" color="green" />{' '}
              {displayData.repostCount || 0}
            </span>
          </div>
          {displayData.slug && (
            <div
              className="flex items-center gap-1 text-sm text-gray-500"
              title="Post slug"
            >
              <FolderPen className="w-4 h-4 text-blue-500" /> {displayData.slug}
            </div>
          )}
          <div className="flex flex-1 justify-end">
            {displayData.group && (
              <LinkButton
                href={`/groups/${displayData.group}`}
                variant="icon"
                className="flex items-center gap-1 text-sm text-gray-500 mr-4"
                title={`Posted in group ${displayData.group}`}
              >
                <Folder className="w-4 h-4 text-blue-500" />
                <span>{displayData.group}</span>
              </LinkButton>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (variant === 'compact') {
    return compactPostView({ displayData: item })
  }

  return fullSizedView({ displayData: item })
}

interface ReplyParentsProps {
  parent?: PostDisplayData
  root?: PostDisplayData
}

function ReplyParents({ parent, root }: ReplyParentsProps) {
  if (!parent || !root) {
    return null
  }

  return (
    <div className="border-l-4 border-blue-500 pl-4 ml-2 mb-2">
      {root && (
        <div className="mb-2">
          {root.author?.handle && (
            <span className="text-gray-500 text-sm">
              Root post by{' '}
              <span className="text-blue-500">@{root.author?.handle}</span>
            </span>
          )}

          <div className="text-gray-600 dark:text-gray-400 text-sm mt-1 italic">
            "{root?.text || ''}"
          </div>
        </div>
      )}
      {parent && (
        <div className="mb-2">
          {parent.author?.handle && (
            <span className="text-gray-500 text-sm">
              Parent post by{' '}
              <span className="text-blue-500">@{parent.author?.handle}</span>
            </span>
          )}
          <div className="text-gray-600 dark:text-gray-400 text-sm mt-1 italic">
            "{parent.text || ''}"
          </div>
        </div>
      )}
    </div>
  )
}

export { ReplyParents }
export type { PostDisplayData }
