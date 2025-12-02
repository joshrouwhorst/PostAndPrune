import Logger from '@/app/api-helpers/logger'
import { getPaths } from '@/config/main'
import { type NextRequest, NextResponse } from 'next/server'
import fs from 'node:fs'
import path from 'node:path'

const logger = new Logger('DraftMediaRoute')

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const { draftPostsPath } = getPaths()
    const resolvedParams = await params
    const imagePath = path.join(draftPostsPath, ...resolvedParams.path)

    // Security check: ensure the path is within DRAFT_POSTS_PATH
    const resolvedPath = path.resolve(imagePath)
    const resolvedDraftPath = path.resolve(draftPostsPath)

    if (!resolvedPath.startsWith(resolvedDraftPath)) {
      logger.error('Access denied to path:', resolvedPath)
      return new NextResponse('Forbidden', { status: 403 })
    }

    // Check if file exists
    if (!fs.existsSync(resolvedPath)) {
      logger.error('Image not found at path:', resolvedPath)
      return new NextResponse('Image not found', { status: 404 })
    }

    // Read the file
    const imageBuffer = fs.readFileSync(resolvedPath)

    // Determine content type based on file extension
    const ext = path.extname(resolvedPath).toLowerCase()
    const contentType = getContentType(ext)

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      },
    })
  } catch (error) {
    logger.error('Error serving image:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

function getContentType(ext: string): string {
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.png':
      return 'image/png'
    case '.gif':
      return 'image/gif'
    case '.webp':
      return 'image/webp'
    default:
      return 'image/jpeg'
  }
}

export async function DELETE(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ path: string[] }>
  },
) {
  try {
    const { draftPostsPath } = getPaths()
    const resolvedParams = await params
    const imagePath = path.join(draftPostsPath, ...resolvedParams.path)

    // Security check: ensure the path is within DRAFT_POSTS_PATH
    const resolvedPath = path.resolve(imagePath)
    const resolvedDraftPath = path.resolve(draftPostsPath)

    if (!resolvedPath.startsWith(resolvedDraftPath)) {
      logger.error('Access denied for DELETE request to path:', resolvedPath)
      return new NextResponse('Forbidden', { status: 403 })
    }

    // Check if file exists
    if (!fs.existsSync(resolvedPath)) {
      logger.error('Image not found for DELETE request at path:', resolvedPath)
      return new NextResponse('Image not found', { status: 404 })
    }

    // Delete the file
    fs.unlinkSync(resolvedPath)

    return new NextResponse('Media deleted', { status: 200 })
  } catch (error) {
    logger.error('Error deleting media:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
