import { getPaths } from '@/config/main'
import { NextResponse } from 'next/server'
import fs from 'node:fs'
import path from 'node:path'
import Logger from '../../../api-helpers/logger'

const logger = new Logger('MediaRoute')

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url)
    logger.log('Request URL:', requestUrl.toString())

    const mediaUrlPath = requestUrl.pathname.replace('/api/media/', '')

    const { backupPath } = await getPaths()
    const mediaPath = path.join(backupPath, mediaUrlPath)

    // Security check: ensure the path is within BACKUP_PATH
    const resolvedPath = path.resolve(mediaPath)
    const resolvedBackupPath = path.resolve(backupPath)

    if (!resolvedPath.startsWith(resolvedBackupPath)) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    //'/Users/josh/Local Files/GitHub Repos/BskyBackup/TestData/20251122/backup/b180ee02-6ff3-4cfd-99c0-ef1210aed786/media/2025/jpeg/bafyreia672shun4ikmf44mv74j54basoth3xnfljxz6j5ukhpkuy3mq5zm_0.jpeg'
    // bafyreia672shun4ikmf44mv74j54basoth3xnfljxz6j5ukhpkuy3mq5zm_0

    // Check if file exists
    if (!fs.existsSync(resolvedPath)) {
      return new NextResponse('Media not found', { status: 404 })
    }

    // Read the file
    const mediaBuffer = fs.readFileSync(resolvedPath)
    // Determine content type based on file extension
    const ext = path.extname(resolvedPath).toLowerCase()
    const contentType = getContentType(ext)

    return new NextResponse(mediaBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      },
    })
  } catch (error) {
    logger.error('Error serving media:', error)
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
