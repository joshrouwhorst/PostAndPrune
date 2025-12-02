/** biome-ignore-all assist/source/organizeImports: a */
import Logger from '@/app/api-helpers/logger'
import { NextResponse } from 'next/server'
import { withSocialLogoutAndErrorHandling } from '../../api-helpers/apiWrapper'
import { prunePosts } from '../services/BackupService'

const logger = new Logger('PruneRoute')

export const POST = withSocialLogoutAndErrorHandling(async () => {
  try {
    logger.log('Prune API request received')
    await prunePosts()
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Failed to prune posts', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
})
