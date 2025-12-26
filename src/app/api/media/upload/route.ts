import { getPaths } from '@/config/main'
import { NextRequest, NextResponse } from 'next/server'
import fs from 'node:fs/promises'
import path from 'node:path'
import Logger from '../../../api-helpers/logger'

const logger = new Logger('MediaUpload')

export async function POST(request: NextRequest) {
  try {
    logger.log('Processing media upload for Threads...')

    const formData = await request.formData()
    const file = formData.get('file') as File
    const mediaType = formData.get('mediaType') as string
    const altText = formData.get('altText') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!mediaType || !['image', 'video'].includes(mediaType)) {
      return NextResponse.json(
        { error: 'Invalid mediaType. Must be image or video' },
        { status: 400 },
      )
    }

    // Validate file type based on mediaType
    if (mediaType === 'image' && !file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image for mediaType=image' },
        { status: 400 },
      )
    }

    if (mediaType === 'video' && !file.type.startsWith('video/')) {
      return NextResponse.json(
        { error: 'File must be a video for mediaType=video' },
        { status: 400 },
      )
    }

    // Generate unique filename
    const timestamp = Date.now()
    const ext = path.extname(file.name) || getDefaultExtension(file.type)
    const filename = `threads_${timestamp}${ext}`

    // Create upload directory structure
    const { backupPath } = await getPaths()
    const uploadDir = path.join(backupPath, 'uploads', 'threads', mediaType)

    try {
      await fs.mkdir(uploadDir, { recursive: true })
    } catch (error) {
      logger.error('Failed to create upload directory:', error)
      return NextResponse.json(
        { error: 'Failed to create upload directory' },
        { status: 500 },
      )
    }

    // Save file
    const filePath = path.join(uploadDir, filename)
    const buffer = Buffer.from(await file.arrayBuffer())

    try {
      await fs.writeFile(filePath, buffer)
    } catch (error) {
      logger.error('Failed to save file:', error)
      return NextResponse.json(
        { error: 'Failed to save file' },
        { status: 500 },
      )
    }

    // Generate public URL
    const baseUrl = getBaseUrl(request)
    const publicUrl = `${baseUrl}/api/media/uploads/threads/${mediaType}/${filename}`

    logger.log(`Successfully uploaded ${file.name} as ${filename}`)

    return NextResponse.json({
      success: true,
      filename,
      publicUrl,
      mediaType,
      size: file.size,
      altText: altText || undefined,
    })
  } catch (error) {
    logger.error('Error uploading media:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

function getDefaultExtension(mimeType: string): string {
  switch (mimeType) {
    case 'image/jpeg':
      return '.jpg'
    case 'image/png':
      return '.png'
    case 'image/gif':
      return '.gif'
    case 'image/webp':
      return '.webp'
    case 'video/mp4':
      return '.mp4'
    case 'video/webm':
      return '.webm'
    case 'video/quicktime':
      return '.mov'
    default:
      return '.bin'
  }
}

function getBaseUrl(request: NextRequest): string {
  const host = request.headers.get('host')
  const protocol = request.headers.get('x-forwarded-proto') || 'http'
  return `${protocol}://${host}`
}
