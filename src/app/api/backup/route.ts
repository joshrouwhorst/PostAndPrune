import { type NextRequest, NextResponse } from 'next/server'
import {
  withSocialLogoutAndErrorHandling,
  withSocialLogoutAndErrorHandlingForRequest,
} from '../../api-helpers/apiWrapper'
import Logger from '../../api-helpers/logger'
import { getBackups, runBackup } from '../services/BackupService'

const logger = new Logger('BackupRoute')

// GET handler - wrapped with automatic Bluesky logout
export const GET = withSocialLogoutAndErrorHandling(async () => {
  logger.log('Starting backup fetch')
  const backups = await getBackups()
  return NextResponse.json(backups)
})

// POST handler - wrapped with automatic Bluesky logout
export const POST = withSocialLogoutAndErrorHandlingForRequest(
  async (request: NextRequest) => {
    logger.log('Starting backup run')
    const url = new URL(request.url)
    const accountIds: string[] = (
      url.searchParams.get('accountIds') || ''
    ).split(',')

    await runBackup(accountIds)

    return NextResponse.json({
      success: true,
      message: 'Backup completed successfully',
    })
  }
)
