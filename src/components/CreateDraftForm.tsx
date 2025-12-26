// TODO: Implement delete functionality for uploaded files

'use client'

import {
  Button,
  Input,
  Label,
  LinkButton,
  Textarea,
} from '@/components/ui/forms'
import { DEFAULT_GROUP } from '@/config/frontend'
import { useDrafts } from '@/hooks/useDrafts'
import type { CreateDraftInput, DraftMedia } from '@/types/drafts'
import { ExternalLink, X } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface CreateDraftFormProps {
  redirect?: string
  directoryName?: string
}

export function CreateDraftForm({
  redirect,
  directoryName,
}: CreateDraftFormProps) {
  const { getDraft, createDraft, updateDraft } = useDrafts()
  const [text, setText] = useState('')
  const [filesToUpload, setFilesToUpload] = useState<File[]>([])
  const [uploadedFiles, setUploadedFiles] = useState<DraftMedia[]>([])
  const [group, setGroup] = useState('')
  const [slug, setSlug] = useState('')
  const router = useRouter()

  useEffect(() => {
    const fetchDraft = async () => {
      if (!directoryName) return
      // Fetch draft data and populate form
      const draft = await getDraft(directoryName)
      if (draft) {
        setText(draft.meta.text || '')
        setSlug(draft.meta.slug || '')
        setFilesToUpload([])
        setUploadedFiles(
          draft.meta.images.length > 0
            ? draft.meta.images
            : draft.meta.video
              ? [draft.meta.video]
              : [],
        )
        setGroup(draft.group || '')
      }
    }
    fetchDraft()
  }, [directoryName, getDraft])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    setFilesToUpload((prev) => [...prev, ...selectedFiles].slice(0, 4))
  }

  const removeFile = (index: number) => {
    setFilesToUpload((prev) => prev.filter((_, i) => i !== index))
  }

  const convertFileToBuffer = async (file: File): Promise<ArrayBuffer> => {
    const arrayBuffer = await file.arrayBuffer()
    return arrayBuffer
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const images = []
    let video = null

    for (const file of filesToUpload) {
      const data = await convertFileToBuffer(file)

      if (file.type.startsWith('image/')) {
        images.push({
          kind: 'image' as const,
          filename: file.name,
          mime: file.type,
          data: Buffer.from(data),
          base64: Buffer.from(data).toString('base64'),
        })
      } else if (file.type.startsWith('video/')) {
        video = {
          kind: 'video' as const,
          filename: file.name,
          mime: file.type,
          data: Buffer.from(data),
          base64: Buffer.from(data).toString('base64'),
        }
        break // Only one video allowed
      } else {
        console.error(`Unsupported file type: ${file.type}`)
        alert(`Unsupported file type: ${file.type}`)
        return
      }
    }

    const submitData: CreateDraftInput = {
      slug: slug || undefined,
      text: text || undefined,
      images: images.length > 0 ? images : undefined,
      video: video || undefined,
      group: group || DEFAULT_GROUP,
    }
    if (directoryName) {
      await updateDraft(directoryName, submitData)
    } else {
      // Creating new draft
      await createDraft(submitData)
    }

    setText('')
    setFilesToUpload([])
    setGroup('')

    if (redirect) {
      router.push(redirect)
    }
  }

  const handleCancel = () => {
    if (redirect) {
      router.push(redirect)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-900"
    >
      <div>
        <Label htmlFor="text">Post Text</Label>
        <Textarea
          id="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What's happening?"
          className="min-h-[100px]"
        />
      </div>

      <div>
        <Label htmlFor="group">Slug (optional)</Label>
        <p className="mb-2 text-sm text-gray-500">
          This allows you to set a human readable identifier for the draft's
          directory. If you don't set one, it will be randomly generated.
        </p>
        <Input
          id="slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="e.g., portraits, landscapes."
        />
      </div>

      <div>
        <Label htmlFor="group">Group (optional)</Label>
        <p className="mb-2 text-sm text-gray-500">
          The group is associated with scheduling. It also is the subdirectory
          the post is stored in on your filesystem.
        </p>
        <Input
          id="group"
          value={group}
          onChange={(e) => setGroup(e.target.value)}
          placeholder="e.g., throwbacks, new-releases, taco-tuesdays etc."
        />
      </div>

      <div>
        <Label htmlFor="media">Media</Label>
        <p className="mb-2 text-sm text-gray-500">
          {' '}
          Up to 4 images or 1 video.
        </p>
        <Input
          id="media"
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={handleFileUpload}
          disabled={filesToUpload.length >= 4}
        />
      </div>

      <UploadedFilesOutput files={uploadedFiles} />

      {filesToUpload.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {filesToUpload.map((file, index) => (
            <div key={file.name} className="relative">
              <div className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-800 rounded">
                {file.type.startsWith('image/') ? (
                  // biome-ignore lint/performance/noImgElement: Need it for a data URL
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="w-16 h-16 object-cover rounded"
                  />
                ) : (
                  <video
                    src={URL.createObjectURL(file)}
                    className="w-16 h-16 object-cover rounded"
                    muted
                  />
                )}
                <span className="text-sm truncate">{file.name}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => removeFile(index)}
                  className="ml-auto"
                >
                  <X size={14} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Platform Compatibility Section */}
      <PlatformCompatibilityIndicator
        textLength={text.length}
        imageCount={
          filesToUpload.filter((f) => f.type.startsWith('image/')).length +
          uploadedFiles.filter((f) => f.kind === 'image').length
        }
        hasVideo={
          filesToUpload.some((f) => f.type.startsWith('video/')) ||
          uploadedFiles.some((f) => f.kind === 'video')
        }
      />

      <div className="flex gap-2">
        <Button type="submit">
          {directoryName ? 'Update Draft' : 'Create Draft'}
        </Button>
        <Button type="button" variant="secondary" onClick={handleCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

function UploadedFilesOutput({ files }: { files: DraftMedia[] }) {
  const { deleteMediaFromDraft } = useDrafts()
  if (files.length === 0) return <div>No files uploaded</div>
  return (
    <div className="mt-2">
      <Label>Uploaded Files:</Label>
      <ul className="m-0 p-0 list-none grid grid-cols-4 gap-2">
        {files.map((file) => (
          <li key={file.filename} className="relative aspect-square group">
            <Image
              src={file.url as string}
              alt={'Photograph'}
              fill
              className="object-cover rounded"
            />
            <LinkButton
              type="button"
              variant="icon"
              title="Open in new tab"
              href={file.url as string}
              target="_blank"
              rel="noopener noreferrer"
              color="primary"
              className="absolute top-1 right-1 opacity-0 group-hover:opacity-100"
              tabIndex={-1}
            >
              <ExternalLink size={16} />
            </LinkButton>

            <Button
              type="button"
              variant="icon"
              color="danger"
              title="Delete file"
              onClick={async () => {
                if (confirm('Are you sure you want to delete this file?')) {
                  await deleteMediaFromDraft(file.url as string)
                }
              }}
              className="absolute top-1 left-1 opacity-0 group-hover:opacity-100"
              tabIndex={-1}
            >
              <X size={16} />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}

// Platform Compatibility Indicator Component
interface PlatformCompatibilityIndicatorProps {
  textLength: number
  imageCount: number
  hasVideo: boolean
}

function PlatformCompatibilityIndicator({
  textLength,
  imageCount,
  hasVideo,
}: PlatformCompatibilityIndicatorProps) {
  const checkBlueskyCompatibility = () => {
    const issues: string[] = []

    if (textLength > 300) {
      issues.push('Text exceeds 300 character limit')
    }
    if (imageCount > 4) {
      issues.push('More than 4 images not supported')
    }
    if (hasVideo && imageCount > 0) {
      issues.push('Cannot mix video and images')
    }

    return {
      compatible: issues.length === 0,
      issues,
    }
  }

  const checkThreadsCompatibility = () => {
    const issues: string[] = []

    if (textLength > 500) {
      issues.push('Text exceeds 500 character limit')
    }
    if (imageCount > 10) {
      issues.push('More than 10 images not supported')
    }
    if (hasVideo && imageCount > 0) {
      issues.push('Cannot mix video and images')
    }

    return {
      compatible: issues.length === 0,
      issues,
    }
  }

  const bluesky = checkBlueskyCompatibility()
  const threads = checkThreadsCompatibility()

  return (
    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
      <h3 className="text-sm font-semibold mb-2">Platform Compatibility</h3>

      <div className="grid grid-cols-2 gap-3">
        {/* Bluesky Compatibility */}
        <div
          className={`p-3 rounded border-2 ${
            bluesky.compatible
              ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
              : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-sm font-medium ${bluesky.compatible ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}
            >
              Bluesky
            </span>
            <span
              className={`text-xs ${bluesky.compatible ? 'text-green-600 dark:text-green-300' : 'text-red-600 dark:text-red-300'}`}
            >
              {bluesky.compatible ? '✓ Compatible' : '⚠ Issues'}
            </span>
          </div>
          {!bluesky.compatible && (
            <ul className="text-xs text-red-600 dark:text-red-300 ml-2">
              {bluesky.issues.map((issue, index) => (
                <li key={index}>• {issue}</li>
              ))}
            </ul>
          )}
        </div>

        {/* Threads Compatibility */}
        <div
          className={`p-3 rounded border-2 ${
            threads.compatible
              ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
              : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-sm font-medium ${threads.compatible ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}
            >
              Threads
            </span>
            <span
              className={`text-xs ${threads.compatible ? 'text-green-600 dark:text-green-300' : 'text-red-600 dark:text-red-300'}`}
            >
              {threads.compatible ? '✓ Compatible' : '⚠ Issues'}
            </span>
          </div>
          {!threads.compatible && (
            <ul className="text-xs text-red-600 dark:text-red-300 ml-2">
              {threads.issues.map((issue, index) => (
                <li key={index}>• {issue}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Character count */}
      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
          <span>Character count: {textLength}</span>
          <div className="flex gap-4">
            <span
              className={textLength <= 300 ? 'text-green-600' : 'text-red-600'}
            >
              Bluesky: {textLength}/300
            </span>
            <span
              className={textLength <= 500 ? 'text-green-600' : 'text-red-600'}
            >
              Threads: {textLength}/500
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
