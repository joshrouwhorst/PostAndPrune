import { NextResponse } from 'next/server'
import { withSocialLogoutAndErrorHandling } from '../../api-helpers/apiWrapper'
import Logger from '../../api-helpers/logger'
import {
  getBackupAsPostDisplayData,
  runBackup,
} from '../services/BackupService'

const logger = new Logger('BackupRoute')

// GET handler - wrapped with automatic Bluesky logout
export const GET = withSocialLogoutAndErrorHandling(async () => {
  logger.log('Starting backup fetch')
  const backup = await getBackupAsPostDisplayData()
  return NextResponse.json(backup)
})

// POST handler - wrapped with automatic Bluesky logout
export const POST = withSocialLogoutAndErrorHandling(async () => {
  logger.log('Starting backup run')
  await runBackup()

  return NextResponse.json({
    success: true,
    message: 'Backup completed successfully',
  })
})
