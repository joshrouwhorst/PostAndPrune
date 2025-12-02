import { NextResponse } from 'next/server'
import Logger from '../../api-helpers/logger'
import { getGroups } from '../services/DraftPostService'

const logger = new Logger('GroupsRoute')

export async function GET() {
  try {
    const groups = await getGroups()
    if (!groups || !Array.isArray(groups)) {
      return NextResponse.json({ error: 'Groups not found' }, { status: 404 })
    }
    return NextResponse.json(groups)
  } catch (error) {
    logger.error('Failed to fetch groups', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch groups',
      },
      { status: 500 },
    )
  }
}
