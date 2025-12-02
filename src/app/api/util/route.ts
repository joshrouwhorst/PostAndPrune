import { NextResponse } from 'next/server'
import Logger from '../../api-helpers/logger'
import { ensureCronIsRunning } from '../services/CronService'

const logger = new Logger('UtilRoute')

// Run app initialization
export async function POST(request: Request) {
  const searchParams = new URL(request.url).searchParams
  const action = searchParams.get('action')

  switch (action) {
    case 'init':
      logger.log('Initialization requested via API.')
      await ensureCronIsRunning()
      return NextResponse.json({ message: 'Initialization started' })

    case 'shutdown': // Just a way for the start.js script to signal shutdown
      logger.log('Shutdown signaled via API.')
      // Implement shutdown logic if needed
      return NextResponse.json({ message: 'Shutdown not implemented' })

    default:
      logger.error('Invalid action for POST /api/util:', action)
      return NextResponse.json(
        { error: 'Invalid action. To initialize, set action=init' },
        { status: 400 },
      )
  }
}
