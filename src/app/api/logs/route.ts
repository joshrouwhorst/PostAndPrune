import { LOGS_PATH } from '@/config/main'
import { NextRequest, NextResponse } from 'next/server'
import fs from 'node:fs'
import path from 'node:path'

interface LogFile {
  filename: string
  date: string
  size: number
}

/**
 * GET /api/logs
 *
 * Without query parameters: Returns a list of all log files
 * With ?file=<filename>: Returns the content of a specific log file
 *
 * Query parameters:
 * - file: Filename of the log to retrieve (e.g., "backup-log-2025-10-01.txt")
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const filename = searchParams.get('file')

    // If filename is provided, return the content of that file
    if (filename) {
      return getLogFileContent(filename)
    }

    // Otherwise, return the list of all log files
    return getLogFilesList()
  } catch (error) {
    console.error('Error in logs API:', error)
    return NextResponse.json(
      {
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

/**
 * Get a list of all log files
 */
function getLogFilesList() {
  if (!fs.existsSync(LOGS_PATH)) {
    return NextResponse.json({ files: [] })
  }

  const files = fs.readdirSync(LOGS_PATH)

  // Filter and sort log files
  const logFiles: LogFile[] = files
    .filter((file) => file.startsWith('backup-log-') && file.endsWith('.txt'))
    .map((file) => {
      const filePath = path.join(LOGS_PATH, file)
      const stats = fs.statSync(filePath)

      // Extract date from filename: backup-log-2025-10-01.txt
      const datePart = file.slice(11, 21) // "2025-10-01"

      return {
        filename: file,
        date: datePart,
        size: stats.size,
      }
    })
    .sort((a, b) => b.date.localeCompare(a.date)) // Most recent first

  return NextResponse.json({ files: logFiles })
}

/**
 * Get the content of a specific log file
 */
function getLogFileContent(filename: string) {
  // Security: Prevent directory traversal
  if (
    filename.includes('..') ||
    filename.includes('/') ||
    filename.includes('\\')
  ) {
    return NextResponse.json({ error: 'Invalid filename' }, { status: 400 })
  }

  // Validate filename format
  if (!filename.startsWith('backup-log-') || !filename.endsWith('.txt')) {
    return NextResponse.json(
      {
        error:
          'Invalid log filename format. Expected: backup-log-YYYY-MM-DD.txt',
      },
      { status: 400 },
    )
  }

  const filePath = path.join(LOGS_PATH, filename)

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'Log file not found' }, { status: 404 })
  }

  // Read and return the file content
  const content = fs.readFileSync(filePath, 'utf-8')

  return NextResponse.json({
    filename,
    content,
  })
}

/**
 * DELETE /api/logs?file=<filename>
 *
 * Deletes a specific log file
 *
 * Query parameters:
 * - file: Filename of the log to delete (e.g., "backup-log-2025-10-01.txt")
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const filename = searchParams.get('file')

    if (!filename) {
      return NextResponse.json(
        { error: 'Filename parameter is required' },
        { status: 400 },
      )
    }

    // Security: Prevent directory traversal
    if (
      filename.includes('..') ||
      filename.includes('/') ||
      filename.includes('\\')
    ) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 })
    }

    // Validate filename format
    if (!filename.startsWith('backup-log-') || !filename.endsWith('.txt')) {
      return NextResponse.json(
        {
          error:
            'Invalid log filename format. Expected: backup-log-YYYY-MM-DD.txt',
        },
        { status: 400 },
      )
    }

    const filePath = path.join(LOGS_PATH, filename)

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Log file not found' }, { status: 404 })
    }

    // Delete the file
    fs.unlinkSync(filePath)

    return NextResponse.json({
      success: true,
      message: `Log file ${filename} deleted successfully`,
    })
  } catch (error) {
    console.error('Error deleting log file:', error)
    return NextResponse.json(
      {
        error: 'Failed to delete log file',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
