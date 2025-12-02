import { NextResponse } from 'next/server'
import { getAppData } from '../../api-helpers/appData'
import Logger from '../../api-helpers/logger'

const logger = new Logger('AppDataRoute')

export async function GET() {
  try {
    const appData = await getAppData()
    // TODO: Move this to a bluesky or backup endpoint
    const { lastBackup } = appData // Making sure only to expose these fields
    return NextResponse.json({
      lastBackup,
    })
  } catch (error) {
    logger.error('Failed to fetch app data', error)
    return NextResponse.json(
      { error: 'Failed to fetch app data' },
      { status: 500 },
    )
  }
}
