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
import { Buffer } from 'buffer'
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
            : []
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

  const convertFileToBuffer = async (file: File): Promise<Buffer> => {
    const arrayBuffer = await file.arrayBuffer()
    return Buffer.from(arrayBuffer)
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
          data,
        })
      } else if (file.type.startsWith('video/')) {
        video = {
          kind: 'video' as const,
          filename: file.name,
          mime: file.type,
          data,
        }
        break // Only one video allowed
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
